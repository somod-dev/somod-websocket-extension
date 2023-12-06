import { Middleware } from "somod";
import { Routes } from "../../../lib/routes-schema";
import { join } from "path";
import {
  FILE_ROUTES_WEBSOCKET_JSON,
  MIDDLEWARE_CONTEXT_KEY,
  PATH_WEBSOCKET_SCHEMAS
} from "../../../lib/constants";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { validate } from "decorated-ajv";
import { ValidateFunction } from "ajv";
import { getWebsocketSchemaPath } from "../../../lib/utils";
import { decode } from "querystring";
import {
  BadRequestError,
  Event,
  NoRouteFoundError,
  Message,
  Result,
  RouteConfig
} from "../../../lib/types";
import { pathToFileURL } from "url";

let configuredRoutes: Routes | null = null;

const getConfiguredRoutes = async () => {
  if (configuredRoutes === null) {
    // NOTE: To Match the path used in prepare stage
    const routesJsonPath = join(
      __dirname,
      PATH_WEBSOCKET_SCHEMAS,
      FILE_ROUTES_WEBSOCKET_JSON
    );
    if (!existsSync(routesJsonPath)) {
      throw new Error("Found no routes at " + routesJsonPath);
    }
    const routesStr = await readFile(routesJsonPath, { encoding: "utf8" });
    const routes = JSON.parse(routesStr);
    if (typeof routes !== "object") {
      throw new Error("Invalid routes configuration in " + routesJsonPath);
    }
    configuredRoutes = routes;
  }
  return configuredRoutes as Routes;
};

const validators: Record<string, ValidateFunction> = {};

const loadValidator = async (routeKey: string) => {
  const validatorPath = getWebsocketSchemaPath(routeKey);
  if (validators[validatorPath] === undefined) {
    try {
      validators[validatorPath] = (
        await import(
          pathToFileURL(
            join(__dirname, PATH_WEBSOCKET_SCHEMAS, validatorPath)
          ).toString()
        )
      ).default;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Error in loading validator", e);
      // @ts-expect-error this is okay to assign the default validate function here
      validators[validatorPath] = () => {
        return true;
      };
    }
  }
  return validators[validatorPath];
};

const getRouteKey = (event: Event) => {
  return event.requestContext.routeKey;
};

const getRouteConfig = async (routeKey: string): Promise<RouteConfig> => {
  const configuredRoutes = await getConfiguredRoutes();
  const routeConfig = configuredRoutes[routeKey];
  if (routeConfig === undefined) {
    throw new NoRouteFoundError(`No route defined for ${routeKey}`);
  }
  return routeConfig;
};

const parseBody = (routeConfig: RouteConfig, event: Event) => {
  let contentType = routeConfig.body?.parser;
  if (contentType === undefined) {
    contentType = "text";
  }

  let parsedBody: string | Record<string, unknown> = event.body || "";

  if (contentType == "json") {
    parsedBody = JSON.parse(parsedBody);
  } else if (contentType == "formdata") {
    parsedBody = decode(parsedBody);
  }

  return parsedBody;
};

const validateBody = async (
  routeKey: string,
  routeConfig: RouteConfig,
  event: Event
) => {
  let validatedBody: unknown = undefined;
  if (routeConfig.body) {
    const validator = await loadValidator(routeKey);
    const parsedBody = parseBody(routeConfig, event);
    const violations = await validate(validator, parsedBody);
    if (violations.length > 0) {
      throw new BadRequestError(
        JSON.stringify({
          message: `Invalid Request Body`,
          errors: violations
        })
      );
    }
    validatedBody = parsedBody;
  }
  return validatedBody;
};

const middleware: Middleware<Event, Result> = async (next, event) => {
  try {
    const routeKey = getRouteKey(event);

    const routeConfig = await getRouteConfig(routeKey);

    const validatedBody = await validateBody(routeKey, routeConfig, event);

    const somodWebsocketMessage: Message = {
      routeKey,
      body: validatedBody
    };

    event.somodMiddlewareContext.set(
      MIDDLEWARE_CONTEXT_KEY,
      somodWebsocketMessage
    );

    return await next();
  } catch (e) {
    if (e instanceof NoRouteFoundError) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: e.message
      };
    } else if (e instanceof BadRequestError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: e.message
      };
    } else {
      // eslint-disable-next-line no-console
      console.error(e.message);
      return {
        statusCode: 500
      };
    }
  }
};

export default middleware;
