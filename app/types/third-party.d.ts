declare module 'pg' {
  export class Pool {
    constructor(opts?: any)
    query(queryText: string, params?: any[]): Promise<any>
    connect(): Promise<any>
  }
}
