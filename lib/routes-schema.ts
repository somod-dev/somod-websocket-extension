import { JSONSchema7 } from "json-schema";
import routesSchema from "../schemas/websocket-routes.json";

export type Routes = Record<
  string,
  {
    body: {
      parser?: "text" | "json" | "formdata";
      schema: JSONSchema7;
    };
  }
>;

export const schema = routesSchema as JSONSchema7;
