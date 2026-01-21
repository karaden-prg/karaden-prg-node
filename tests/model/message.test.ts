import { randomUUID } from 'crypto';
import { Message, MessageCancelParams, MessageCreateParams, MessageDetailParams, MessageListParams } from '../../src';
import { Carrier, Collection, Result, SentResult, Status } from '../../src/model';
import { TestHelper } from '../helper';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('メッセージを作成できる', async () => {
    const params = MessageCreateParams.newBuilder()
        .withServiceId(1)
        .withTo('to')
        .withBody('body')
        .withTags(['a', 'b'])
        .build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    const id = randomUUID();
    server.use(
        http.post(requestOptions.getBaseUri() + params.toPath(), async ({ request }) => {
            const formData = await request.formData();
            return request.headers.get('Content-Type') == 'application/x-www-form-urlencoded'
                ? HttpResponse.json({
                      id: id,
                      object: 'message',
                      service_id: parseInt(formData.get('service_id')!.toString()),
                      to: formData.get('to'),
                      body: formData.get('body'),
                      tags: [formData.get('tags[0]'), formData.get('tags[1]')],
                  })
                : HttpResponse.error();
        })
    );

    const message = await Message.create(params, requestOptions);
    expect(message.id).toBe(id);
    expect(message.object).toBe('message');
    expect(message.serviceId).toBe(params.serviceId);
    expect(message.to).toBe(params.to);
    expect(message.body).toBe(params.body);
    expect(message.tags).toStrictEqual(params.tags);
});

test('メッセージの詳細を取得できる', async () => {
    const params = MessageDetailParams.newBuilder().withId(randomUUID()).build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    server.use(
        http.get(requestOptions.getBaseUri() + params.toPath(), async ({ request }) =>
            HttpResponse.json({
                id: request.url.substring(request.url.lastIndexOf('/') + 1),
                object: 'message',
            })
        )
    );

    const message = await Message.detail(params, requestOptions);
    expect(message.id).toBe(params.id);
});

test('メッセージの一覧を取得できる', async () => {
    const params = MessageListParams.newBuilder().build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    server.use(http.get(requestOptions.getBaseUri() + params.toPath(), () => HttpResponse.json({ object: 'list' })));

    const list = await Message.list(params, requestOptions);
    expect(list).toBeInstanceOf(Collection);
});

test('メッセージの送信をキャンセルできる', async () => {
    const params = MessageCancelParams.newBuilder().withId(randomUUID()).build();
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();

    server.use(
        http.post(requestOptions.getBaseUri() + params.toPath(), ({ request }) => {
            const end = request.url.lastIndexOf('/cancel');
            const start = request.url.lastIndexOf('/', end - 1) + 1;
            return HttpResponse.json({
                id: request.url.substring(start, end),
                object: 'message',
            });
        })
    );

    const message = await Message.cancel(params, requestOptions);
    expect(message.id).toBe(params.id);
});

test('serviceIdを出力できる', () => {
    const value = 1;
    const message = new Message();
    message.setProperty('service_id', value);
    expect(message.serviceId).toBe(value);
});

test('billingAddressIdを出力できる', () => {
    const value = 1;
    const message = new Message();
    message.setProperty('billing_address_id', value);
    expect(message.billingAddressId).toBe(value);
});

test('toを出力できる', () => {
    const value = '1234567890';
    const message = new Message();
    message.setProperty('to', value);
    expect(message.to).toBe(value);
});

test('tagsを出力できる', () => {
    const value = ['tag'];
    const message = new Message();
    message.setProperty('tags', value);
    expect(message.tags).toBe(value);
});

test('statusを出力できる', () => {
    const value = Status.Done;
    const message = new Message();
    message.setProperty('status', value);
    expect(message.status).toBe(value);
});

test('APIバージョン20230101ではisShortenClickedはnullが出力される', () => {
    // APIバージョン2023-01-01ではnullが返ってくる
    const value = null;
    const message = new Message();
    message.setProperty('is_shorten_clicked', value);
    expect(message.isShortenClicked).toBe(value);
});

test('APIバージョン20231201ではisShortenClickedはbooleanが出力される', () => {
    // APIバージョン2023-12-01ではbooleanが返ってくる
    const value = true;
    const message = new Message();
    message.setProperty('is_shorten_clicked', value);
    expect(message.isShortenClicked).toBeTruthy;
});

test('resultを出力できる', () => {
    const value = Result.Done;
    const message = new Message();
    message.setProperty('result', value);
    expect(message.result).toBe(value);
});

test('sentResultを出力できる', () => {
    const value = SentResult.None;
    const message = new Message();
    message.setProperty('sent_result', value);
    expect(message.sentResult).toBe(value);
});

test('carrierを出力できる', () => {
    const value = Carrier.Docomo;
    const message = new Message();
    message.setProperty('carrier', value);
    expect(message.carrier).toBe(value);
});

test('scheduledAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('scheduled_at', value);
    expect(message.scheduledAt).toEqual(new Date(value));
});

test('limitedAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('limited_at', value);
    expect(message.limitedAt).toEqual(new Date(value));
});

test('sentAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('sent_at', value);
    expect(message.sentAt).toEqual(new Date(value));
});

test('receivedAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('received_at', value);
    expect(message.receivedAt).toEqual(new Date(value));
});

test('chargedAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('charged_at', value);
    expect(message.chargedAt).toEqual(new Date(value));
});

test('createdAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('created_at', value);
    expect(message.createdAt).toEqual(new Date(value));
});

test('updatedAtを出力できる', () => {
    const value = '2023-07-31T00:00:00+09:00';
    const message = new Message();
    message.setProperty('updated_at', value);
    expect(message.updatedAt).toEqual(new Date(value));
});
