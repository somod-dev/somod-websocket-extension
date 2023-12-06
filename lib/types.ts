import {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2
} from "aws-lambda";
import { Routes } from "./routes-schema";

type Copy<T> = { [K in keyof T]: T[K] };
export type Event = Copy<APIGatewayProxyWebsocketEventV2>;
export type Result = Copy<APIGatewayProxyResultV2>;

export type RouteConfig = Routes[string];

export type Message<T = unknown> = {
  routeKey: string;
  body: T;
};

export class NoRouteFoundError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export type RouteHandler<T = unknown> = (
  message: Message<T>,
  event: APIGatewayProxyWebsocketEventV2
) => Promise<APIGatewayProxyResultV2>;
