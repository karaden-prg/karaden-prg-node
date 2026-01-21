import { randomUUID } from 'crypto';
import {
    BulkMessage,
    BulkMessageCreateParams,
    BulkMessageListMessageParams,
    BulkMessageShowParams,
    Error,
} from '../../src';
import { TestHelper } from '../helper';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('一括送信メッセージを作成できる', async () => {
    const params = BulkMessageCreateParams.newBuilder().withBulkFileId(randomUUID()).build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    const id = randomUUID();
    server.use(
        http.post(requestOptions.getBaseUri() + params.toPath(), async ({ request }) =>
            (await request.formData()).get('bulk_file_id') == params.bulkFileId &&
            request.headers.get('Content-Type') == 'application/x-www-form-urlencoded'
                ? HttpResponse.json({
                      id: id,
                      object: 'bulk_message',
                  })
                : HttpResponse.error()
        )
    );

    const bulkMessage = await BulkMessage.create(params, requestOptions);
    expect(bulkMessage.id).toBe(id);
});

test('一括送信メッセージの詳細を取得できる', async () => {
    const params = BulkMessageShowParams.newBuilder().withId(randomUUID()).build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    server.use(
        http.get(requestOptions.getBaseUri() + params.toPath(), ({ request }) =>
            HttpResponse.json({
                id: request.url.substring(request.url.lastIndexOf('/') + 1),
                object: 'bulk_message',
            })
        )
    );

    const bulkMessage = await BulkMessage.show(params, requestOptions);
    expect(bulkMessage.id).toBe(params.id);
});

test('一括送信メッセージの結果を取得できる', async () => {
    const params = BulkMessageListMessageParams.newBuilder().withId(randomUUID()).build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    //HttpResponse.redirectすると末尾に/が補完されてテストがパスしない
    const expectUrl = 'http://example.com/';

    server.use(http.get(requestOptions.getBaseUri() + params.toPath(), () => HttpResponse.redirect(expectUrl, 302)));

    const actualUrl = await BulkMessage.listMessage(params, requestOptions);
    expect(actualUrl).toBe(expectUrl);
});

describe.each([['location'], ['LOCATION']])(
    'Locationが大文字小文字関係なく一括送信メッセージの結果を取得できる',
    (data: string) => {
        test(`locationは${data}`, async () => {
            const params = BulkMessageListMessageParams.newBuilder().withId(randomUUID()).build();
            const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
            const expectUrl = 'http://example.com';

            server.use(
                http.get(requestOptions.getBaseUri() + params.toPath(), () => {
                    const response = HttpResponse.text(null, { status: 302 });
                    response.headers.set(data, expectUrl);
                    return response;
                })
            );

            const actualUrl = await BulkMessage.listMessage(params, requestOptions);
            expect(actualUrl).toBe(expectUrl);
        });
    }
);

test('statusを出力できる', () => {
    const value = 'processing';
    const bulkMessage = new BulkMessage();
    bulkMessage.setProperty('status', value);
    expect(bulkMessage.status).toBe(value);
});

test('受付エラーがない場合はerrorは出力されない', () => {
    const error = undefined;
    const bulkMessage = new BulkMessage();
    bulkMessage.setProperty('error', error);
    expect(bulkMessage.status).toBe(error);
});

test('受付エラーがあった場合はerrorが出力される', () => {
    const error = new Error();
    const bulkMessage = new BulkMessage();
    bulkMessage.setProperty('error', error);
    expect(bulkMessage.error).toBeInstanceOf(Error);
});

test('createdAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const bulkMessage = new BulkMessage();
    bulkMessage.setProperty('created_at', value);
    expect(bulkMessage.createdAt).toEqual(new Date(value));
});

test('updatedAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const bulkMessage = new BulkMessage();
    bulkMessage.setProperty('updated_at', value);
    expect(bulkMessage.updatedAt).toEqual(new Date(value));
});
