import { RequestOptions, RequestOptionsBuilder } from '../src';

export class TestHelper {
    public static API_BASE: string = 'http://localhost:4010';
    public static API_KEY: string = '123';
    public static TENANT_ID: string = '159bfd33-b9b7-f424-4755-c119b324591d';
    public static API_VERSION: string = '2024-03-01';

    public static get defaultRequestOptionsBuilder(): RequestOptionsBuilder {
        return RequestOptions.newBuilder()
            .withApiBase(this.API_BASE)
            .withApiKey(this.API_KEY)
            .withTenantId(this.TENANT_ID)
            .withApiVersion(this.API_VERSION);
    }

    public static toBody(formData: FormData): string {
        return [...formData.keys()]
            .map((key: string) => `${encodeURIComponent(key)}=${encodeURIComponent(formData.get(key)!.toString())}`)
            .join('&');
    }
}
