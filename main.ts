import { Netbox } from "./lib/Netbox.ts";

import "npm:dotenv/config";
const [UNAME, UPASS] = [Deno.env.get("UNAME") ?? "USERNAME", Deno.env.get("UPASS") ?? "PASSWORD"];

const api_inst = new Netbox("10.64.3.2");
await api_inst.login(UNAME, UPASS).then((good) => { if (good) console.debug('Logged in!'); });
api_inst.setup();