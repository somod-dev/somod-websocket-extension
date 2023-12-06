import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";
import { EventWithMiddlewareContext } from "somod";
import { Event, Message, RouteHandler } from "./types";
import { MIDDLEWARE_CONTEXT_KEY } from "./constants";

export class RouteBuilder {
  private routes: Record<string, RouteHandler> = {};

  add<T = unknown>(
    routeKey: string,
    routeHandler: RouteHandler<T>
  ): RouteBuilder {
    this.routes[routeKey] = routeHandler as RouteHandler;
    return this;
  }

  getHandler(): APIGatewayProxyWebsocketHandlerV2 {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    return async event => {
      const message = (
        event as EventWithMiddlewareContext<Event>
      ).somodMiddlewareContext.get(MIDDLEWARE_CONTEXT_KEY) as Message;

      const handler = that.routes[message.routeKey];

      if (handler === undefined) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: `No route handler defined for ${message.routeKey}`
          })
        };
      } else {
        return await handler(message, event);
      }
    };
  }
}
