import { TestHelper } from '../helper';
import { Requestable, UnexpectedValueException } from '../../src';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';

const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
const server = setupServer(
    http.get(requestOptions.getBaseUri() + '/test', () => HttpResponse.json({}, { status: 500 }))
);

beforeAll(() => server.listen());
afterAll(() => server.close());

test('request内でrejectしたエラーをcatchできる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    expect.assertions(1);
    await Requestable.request('GET', '/test', null, null, null, requestOptions).catch((error) =>
        expect(error).toBeInstanceOf(UnexpectedValueException)
    );
});

test('requestAndReturnResponseInterface内でrejectしたエラーをcatchできる', async () => {
    const requestOptions = TestHelper.defaultRequestOptionsBuilder.build();
    expect.assertions(1);
    await Requestable.requestAndReturnResponseInterface('GET', 'Test', null, null, null, requestOptions).catch(
        (error) => expect(error).toBeInstanceOf(UnexpectedValueException)
    );
});
