import { ContextId, ContextIdFactory, ContextIdResolver, ContextIdResolverFn, ContextIdStrategy, HostComponentInfo } from "@nestjs/core";
import {Request} from 'express'
export class AggreateByTenantContextIdStrategy implements ContextIdStrategy {

    private readonly tenants = new Map<string,ContextId>()

    attach(contextId: ContextId, request: Request): ContextIdResolverFn | ContextIdResolver | undefined {
        console.log('request',request.headers)
        let tenantId = request?.headers?.get?.['x-tenant-id'] as string 
        if (!tenantId) {
           return ()=>contextId
        }
        
        let tenantSubIdTree :ContextId 
        if(this.tenants.has(tenantId)){
            tenantSubIdTree= this.tenants.get(tenantId) as ContextId
        }
        else {
            tenantSubIdTree = ContextIdFactory.create()
            this.tenants.set(tenantId,tenantSubIdTree)
            setTimeout(()=>{
                this.tenants.delete(tenantId)
               
            },120000)
        }
        return {
            payload:{tenantId},
            resolve:(info:HostComponentInfo)=>
                info.isTreeDurable ? tenantSubIdTree : contextId
        }
    }


}