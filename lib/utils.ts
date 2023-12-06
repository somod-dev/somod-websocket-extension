export const getWebsocketSchemaPath = (routeKey: string) => {
  const schemaKey = routeKey + ":body";

  return Buffer.from(schemaKey, "utf8").toString("base64url") + ".js";
};
