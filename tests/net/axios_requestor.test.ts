import { TestHelper } from '../helper';
import { AxiosRequestor, Config, KaradenObject, Response } from '../../src';

import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('ベースURLとパスが結合される', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const path = '/test';

    server.use(http.get(requestOptions.getBaseUri() + path, () => HttpResponse.json({})));

    await new AxiosRequestor()
        .invoke('GET', path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('メソッドがHTTPクライアントに伝わる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const path = '/test2';
    const method = 'POST';

    server.use(
        http.all(requestOptions.getBaseUri() + path, ({ request }) =>
            request.method == method ? HttpResponse.json({}) : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke(method, path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('URLパラメータがHTTPクライアントに伝わる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const path = '/test3';
    const params = { key1: 'value1', key2: 'value2' };

    server.use(
        http.get(requestOptions.getBaseUri() + path, async ({ request }) =>
            new URL(request.url).searchParams.toString() == new URLSearchParams(params).toString()
                ? HttpResponse.json({})
                : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('GET', path, null, params, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('本文がHTTPクライアントに伝わる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const path = '/test4';
    const data = { key1: 'value1', key2: 'value2' };

    server.use(
        http.post(requestOptions.getBaseUri() + path, async ({ request }) => {
            const formData = await request.formData();
            return formData.get('key1') == data.key1 && formData.get('key2') == data.key2
                ? HttpResponse.json({})
                : HttpResponse.error();
        })
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('POST', path, 'application/x-www-form-urlencoded', null, data, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('リクエスト時に指定したリクエストオプションはコンストラクタのリクエストオプションを上書きする', async () => {
    const apiKey = '456';
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.withApiKey(apiKey).build();
    const path = '/test5';

    server.use(
        http.get(requestOptions.getBaseUri() + path, async ({ request }) =>
            request.headers.get('Authorization') == `Bearer ${apiKey}` ? HttpResponse.json({}) : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('GET', path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('APIキーに基づいてBearer認証ヘッダを出力する', async () => {
    const apiKey = '456';
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.withApiKey(apiKey).build();
    const path = '/test6';

    server.use(
        http.get(requestOptions.getBaseUri() + path, async ({ request }) =>
            request.headers.get('Authorization') == `Bearer ${apiKey}` ? HttpResponse.json({}) : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('GET', path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('APIバージョンを設定した場合はAPIバージョンヘッダを出力する', async () => {
    const apiVersion = '2023-01-01';
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.withApiVersion(apiVersion).build();
    const path = '/test7';

    server.use(
        http.get(requestOptions.getBaseUri() + path, async ({ request }) =>
            request.headers.get('Karaden-Version') == apiVersion ? HttpResponse.json({}) : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('GET', path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});

test('APIバージョンを設定しない場合はデフォルトのAPIバージョンヘッダを出力する', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    const path = '/test8';

    server.use(
        http.get(requestOptions.getBaseUri() + path, async ({ request }) =>
            request.headers.get('Karaden-Version') == Config.DEFAULT_API_VERSION
                ? HttpResponse.json({})
                : HttpResponse.error()
        )
    );

    const requestor = new AxiosRequestor();

    await requestor
        .invoke('GET', path, null, null, null, requestOptions)
        .then((response: Response) => expect(response.object).toBeInstanceOf(KaradenObject));
});
