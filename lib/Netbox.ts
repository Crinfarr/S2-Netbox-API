import { XMLBuilder, XMLParser } from "npm:fast-xml-parser";
type TXmlGeneric = {[key:string]:string|number|TXmlGeneric}
export class Netbox {
    private API_ROOT: URL
    private token?: string

    private builder = new XMLBuilder({ attributeNamePrefix: '$', ignoreAttributes: false });
    private parser = new XMLParser({ attributeNamePrefix: '$', ignoreAttributes: false });

    public OutputMap: Map<string, number> = new Map();
    public ReaderMap: Map<string, number> = new Map();

    constructor(root_ip: string) {
        if (!root_ip.startsWith("http://"))
            root_ip = `http://${root_ip}`;
        this.API_ROOT = new URL(`${root_ip}/nbws/goforms/nbapi`);
    }
    async login(user: string, pass: string): Promise<boolean> {
        console.log(`Attempting to log in ${user}`);
        const body = this.builder.build({
            NETBOX_API: {
                COMMAND: {
                    '$name': 'Login',
                    '$num': 1,
                    '$dateformat': 'tzoffset',
                    PARAMS: {
                        USERNAME: user,
                        PASSWORD: pass
                    }
                }
            }
        });
        const res = await fetch(this.API_ROOT, { body, method: "POST" });
        const xml = this.parser.parse(await res.text());
        if (xml.NETBOX.RESPONSE.APIERROR) {
            console.error(`Failed to login user ${user}: Error ${xml.NETBOX.RESPONSE.APIERROR}`)
            throw (`API Error ${xml.NETBOX.RESPONSE.APIERROR}`);
        }
        this.token = xml.NETBOX.$sessionid;
        console.log(`Successfully logged in ${user}`);
        return true;
    }
    public get loginStatus(): boolean {
        return !!this.token;
    }
    async setup() {
        if (!this.loginStatus) throw ("Not logged in!");
        let body:TXmlGeneric = {
            NETBOX_API: {
                $sessionid: this.token!,
                COMMAND: {
                    $name: 'GetOutputs',
                    $num: 1,
                    PARAMS: {
                        STARTFROMKEY: 0
                    }
                }
            }
        };
        console.log("Setting up output map");
        let stamp = Date.now();
        let request = await fetch(this.API_ROOT, { method: 'POST', body: this.builder.build(body) });
        let xml = this.parser.parse(await request.text());
        if (xml.NETBOX.RESPONSE.CODE != "SUCCESS") {
            throw (`Error: ${xml.NETBOX.RESPONSE.DETAILS.ERRMSG}`);
        }
        for (const { NAME, OUTPUTKEY } of xml.NETBOX.RESPONSE.DETAILS.OUTPUTS.OUTPUT) {
            this.OutputMap.set(NAME, OUTPUTKEY);
        }
        console.log(`Fetched ${this.OutputMap.size} output entries in ${Date.now() - stamp}ms`)
        console.log("Setting up reader map");
        stamp = Date.now();
        body = {
            NETBOX_API: {
                $sessionid: this.token!,
                COMMAND: {
                    $name: "GetReaders",
                    $num: 1,
                    PARAMS: {
                        STARTFROMKEY: 0
                    }
                }
            }
        };
        request = await fetch(this.API_ROOT, { method: 'POST', body: this.builder.build(body)});
        xml = this.parser.parse(await request.text());
        if (xml.NETBOX.RESPONSE.CODE != 'SUCCESS') {
            throw (`Error: ${xml.NETBOX.RESPONSE.DETAILS.ERRMSG}`);
        }
        for (const {READERKEY, NAME, _DESCRIPTION} of xml.NETBOX.RESPONSE.DETAILS.READERS.READER) {
            this.ReaderMap.set(NAME, READERKEY);
        }
        console.log(`Fetched ${this.ReaderMap.size} reader entries in ${Date.now() - stamp}ms`);
    }
    async activateOutput(output: string | number): Promise<void> {
        if (!this.loginStatus) throw ("Not logged in!");
        if (typeof output == "string") {
            if (!this.OutputMap.has(output)) {
                throw ("Invalid output name");
            }
            return await this.activateOutput(this.OutputMap.get(output)!);
        }
        const body:TXmlGeneric = {
            NETBOX_API: {
                $sessionid: this.token!,
                COMMAND: {
                    $name: "ActivateOutput",
                    $num: 1,
                    PARAMS: {
                        OUTPUTKEY: output
                    }
                }
            }
        }
        const request = await fetch(this.API_ROOT, { method: 'POST', body: this.builder.build(body) })
        const xml = this.parser.parse(await request.text());
        if (xml.NETBOX.RESPONSE.CODE != "SUCCESS") {
            throw (`Error: ${xml.NETBOX.RESPONSE.DETAILS.ERRMSG}`);
        } else return;
    }
    async deactivateOutput(output: number | string): Promise<void> {
        if (!this.loginStatus) throw ("Not logged in!");
        if (typeof output == 'string') {
            if (!this.OutputMap.has(output)) {
                throw ("Invalid output name")
            }
            return await this.deactivateOutput(this.OutputMap.get(output)!);
        }
        const body:TXmlGeneric = {
            NETBOX_API: {
                $sessionid: this.token!,
                COMMAND: {
                    $name: "DeactivateOutput",
                    $num: 1,
                    $dateformat: "tzoffset"
                }
            }
        };
        const request = await fetch(this.API_ROOT, { method: 'POST', body: this.builder.build(body) })
        const xml = this.parser.parse(await request.text());
        if (xml.NETBOX.RESPONSE.CODE != 'SUCCESS') {
            throw (`Error: ${xml.NETBOX.RESPONSE.DETAILS.ERRMSG}`);
        } else return;
    }
    async addAccessLevel(
        name: string,
        description: string,
        timeSpecGroup: number | string,
        reader?: number | string,
        readerGroup?: number | string,
        threatLevelGroup?: number | string
    ) {
        if (!this.loginStatus) throw ("Not logged in!");
        if (name.length > 64)
            throw (`Name ${name} is too long: max 64 characters, got ${name.length}`);
        //TODO explicit typedefs for command calls (generics?)
        // deno-lint-ignore no-explicit-any
        const body:any = {
            NETBOX_API: {
                $sessionid: this.token!,
                COMMAND: {
                    $name: "AddAccessLevel",
                    $num: 1,
                    PARAMS: {
                        ACCESSLEVELNAME: name,
                        ACCESSLEVELDESCRIPTION: description
                    }
                }
            }
        };
        if (reader) {
            if (typeof reader == 'string' && !this.ReaderMap.has(reader)) {
                throw "Invalid reader name";
            }
            body.NETBOX_API.COMMAND.PARAMS.READERKEY = (typeof reader == 'string') ? this.ReaderMap.get(reader)! : reader;
        }
        const request = await fetch(this.API_ROOT, {method: "POST", body: this.builder.build(body)});
    }
}

export default Netbox;