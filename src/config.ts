import { RequestOptions } from './request_options.js';

export class Config {
    public static VERSION = '1.2.1';
    public static DEFAULT_API_BASE = 'https://prg.karaden.jp/api';
    public static DEFAULT_API_VERSION = '2024-03-01';

    public static apiVersion = this.DEFAULT_API_VERSION;
    public static apiKey?: string;
    public static tenantId?: string;
    public static userAgent?: string;
    public static apiBase = this.DEFAULT_API_BASE;

    public static reset() {
        this.apiVersion = this.DEFAULT_API_VERSION;
        this.apiKey = undefined;
        this.tenantId = undefined;
        this.userAgent = undefined;
        this.apiBase = this.DEFAULT_API_BASE;
    }

    public static asRequestOptions(): RequestOptions {
        return RequestOptions.newBuilder()
            .withApiVersion(this.apiVersion)
            .withApiKey(this.apiKey)
            .withTenantId(this.tenantId)
            .withUserAgent(this.userAgent)
            .withApiBase(this.apiBase)
            .build();
    }
}
