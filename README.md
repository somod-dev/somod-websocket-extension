# SOMOD WebSocket Extension

---

The [SOMOD](https://somod.dev) Extension Configure WebSocket routes and validate incoming WebSocket Messages in Serverless Functions.

> The middlware in this extension works with Functions of type `WebSocket` Only.

## Install

Install as an npm package in somod modules

```bash
npm install somod-websocket-extension
```

## Usage

### Attach the middleware to the Serverless Function

```yaml
Resources:
  MyWebSocketMessageHandler:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri:
        SOMOD::Function:
          # ...
          middlewares:
            - module: somod-websocket-extension
              resource: SomodWebSocketMiddleware
      # ...
```

Refer to SOMOD's [Middleware](https://docs.somod.dev/reference/main-concepts/serverless/middlewares) reference for more information

### Configure Routes and Schemas

Routes configuration for each serverless function can be provided using a yaml file at `serverless/functions/<function_name>.websocket.yaml`.

Example:

```yaml
# serverless/functions/chat.websocket.yaml

$default:
  body:
    parser: json
    schema:
      type: object
      required: [name]
      properties:
        name:
          type: string
          maxLength: 32
        email:
          type: string
          format: email
```

### Access Sanitized Message

The sanitized Message can be accessed using the [middleware](https://docs.somod.dev/reference/main-concepts/serverless/middlewares)'s context using the **`somod-websocket-message`** key.

Example:

```typescript
// serverless/functions/chat.ts

const ChatHandler = event => {
  const message = event.somodMiddlewareContext.get("somod-websocket-message");
  // use message to read the data from the incoming websocket message
};

export default ChatHandler;
```

This module also provides a utility library to create Serverless Functions with multiple routes easily. Refer to [RouteBuilder](#routeBuilder) for more details

## Specification

### Structure of Routes configuration file

In general, routes configuration in `<function_name>.websocket.yaml` file follows the below structure

```yaml
<routeKey>:
  body:
    parser?: <"text"|"json"|"formdata">. If not provided, automatically choosen based on the Content-Type Header (text is considered if automatic detection fails)
    schema: <json schema>
```

The complete JSONSchema is available [here](/lib/routes-schema.ts)

### Type of the Message object

The message object accessed using `event.somodMiddlewareContext.get("somod-websocket-message")` has this type.

```typescript
type Message<T = unknown> = {
  routeKey: string;
  body: T;
};
```

The `Message` Type is available from this module to use (import as shown below)

```typescript
import { Message } from "somod-websocket-extension";
```

### Error Handling

The middleware immediates ends the Lambda execution and returns appropriate message when Validation fails

## RouteBuilder

The `RouteBuilder` is a wrapper javascript utility library to create serverless functions with multiple routes.

### Using the RouteBuilder

```typescript
// serverless/function/user.ts
import { RouteBuilder } from "somod-websocket-extension";

const builder = new RouteBuilder();

builder.add("$default", defaultMessageHandler);

export default builder.getHandler();
```

### RouteBuilder Specification

RouteBuilder has 2 methods

- `add`

  ```typescript
  function add(
    routeKey: string,
    handler: (message: Message, event: RawEvent) => Promise<Response>
  ): void {
    //
  }
  ```

  The handler receives the [sanitized message object](#type-of-the-message-object) and the raw event from AWS. The handler has to return a promise which resolves to the Response object.

  > The Raw Event type and Response type is documented [here](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html) in the AWS specification.

- `getHandler`

  ```typescript
  function getHandler(): (event: RawEvent) => Promise<Response> {
    //
  }
  ```

  handle function returns the function which is a lambda function handler

## Issues

The project issues, features, and milestones are maintained in this GitHub repo.

Create issues or feature requests at https://github.com/somod-dev/somod-websocket-extension/issues

## Contributions

Please read our [CONTRIBUTING](https://github.com/somod-dev/somod/blob/main/CONTRIBUTING.md) guide before contributing to this project.
