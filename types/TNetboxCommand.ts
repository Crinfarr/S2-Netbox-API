type TParameters = Record<string, number | string | Record<string, number | string>[]>

export type TNetboxAuthenticatedCommand<N extends string, T extends TParameters> = {
    NETBOX_API: {
        $sessionid: string
    }
} & TNetboxCommand<N, T>

export type TNetboxCommand<N extends string, T extends TParameters> = {
    NETBOX_API: {
        COMMAND: {
            $name: N,
            $num: 1,
            PARAMS: T
        }
    }
}
export type TActivateOutput = TNetboxAuthenticatedCommand<
    "ActivateOutput",
    {
        OutputKey: number
    }
>;
export type TAddAccessLevel = TNetboxAuthenticatedCommand<
    "AddAccessLevel",
    {
        ACCESSLEVELNAME: string,
        ACCESSLEVELDESCRIPTION: string,
        READERKEY?: number,
        READERGROUPKEY?: number,
        TIMESPECGROUPKEY: number,
        THREATLEVELGROUPKEY?: number
    }
>;
export type TAddAccessLevelGroup = TNetboxAuthenticatedCommand<
    "AddAccessLevelGroup",
    {
        NAME: string,
        DESCRIPTION: string,
        PARTITIONKEY?: number,
        SYSTEMGROUP?: 1,
        ACCESSLEVELS: [
            {
                NAME?:string,
                KEY?:number,
                PARTITIONKEY?:number
            }
        ]
    }
>;
export type TAddCredential = TNetboxAuthenticatedCommand<
    "AddCredential",
    {
        PERSONID: string,
        CARDFORMAT: string,
        ENCODEDNUM?:number,
        HOTSTAMP?:number,
        WANTCREDENTIALID?:1,
        CARDSTATUS?:"Active"|"Disabled",
        CARDEXPDATE:string
    }
>;
//TODO