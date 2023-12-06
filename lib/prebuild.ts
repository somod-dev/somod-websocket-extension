import { Extension, IContext } from "somod";
import { join } from "path";
import {
  KEYWORD_SOMOD_FUNCTION,
  PATH_FUNCTIONS,
  PATH_SERVERLESS,
  RESOURCE_TYPE_FUNCTION,
  SOMOD_WEBSOCKET_EXTENSION
} from "./constants";
import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { getValidator, validate, Violation } from "decorated-ajv";
import { schema as websocketYamlSchema } from "./routes-schema";
import { readYamlFileStore } from "nodejs-file-utils";
import chalk from "chalk";

/**
 * Validates the schema of all `serverless/functions/<function_name>.websocket.yaml`
 *
 */
export const validateWebsocketYamlFilesSchema = async (context: IContext) => {
  const functionsDir = join(context.dir, PATH_SERVERLESS, PATH_FUNCTIONS);
  if (!existsSync(functionsDir)) {
    // don't do anything if functionsDir does not exist
    return;
  }
  const websocketYamlFiles = (await readdir(functionsDir)).filter(f =>
    f.endsWith(".websocket.yaml")
  );
  const websocketYamlFileViolations: Record<string, Violation[]> = {};
  const schemaValidator = await getValidator(websocketYamlSchema);
  for (const websocketYamlFile of websocketYamlFiles) {
    const yamlContent = await readYamlFileStore(
      join(functionsDir, websocketYamlFile)
    );
    const violations = await validate({}, yamlContent, schemaValidator);
    if (violations.length > 0) {
      websocketYamlFileViolations[websocketYamlFile] = violations;
    }
  }
  if (Object.keys(websocketYamlFileViolations).length > 0) {
    throw new Error(
      `Error validating the .websocket.yaml files : (from ${SOMOD_WEBSOCKET_EXTENSION}): \n${Object.keys(
        websocketYamlFileViolations
      ).map(websocketYamlFile => {
        return ` ${websocketYamlFile} has following errors\n${websocketYamlFileViolations[
          websocketYamlFile
        ].map(violation => {
          return `  ${violation.message} at ${violation.path}`;
        })}`;
      })}`
    );
  }
};

/**
 * Checks if the `.websocket.yaml` exists for functions that have somod-websocket-extension middleware
 *
 * | YAML | Middleware | Result  |
 * | -----| -----------| ----    |
 * | No   | No         | Valid   |
 * | No   | Yes        | Error   |
 * | Yes  | No         | Warning |
 * | Yes  | Yes        | Valid   |
 *
 */
export const validateWebsocketYamlFilesForMiddlewares = async (
  context: IContext
) => {
  const template = context.serverlessTemplateHandler.getTemplate(
    context.moduleHandler.rootModuleName
  );
  if (template == null) {
    return;
  }

  const functionsDir = join(context.dir, PATH_SERVERLESS, PATH_FUNCTIONS);
  const functionsWithWebsocketYamlFiles = existsSync(functionsDir)
    ? (await readdir(functionsDir))
        .filter(f => f.endsWith(".websocket.yaml"))
        .map(f => f.substring(0, f.length - ".websocket.yaml".length))
    : [];
  const functionsWithWebsocketYamlFilesMap = Object.fromEntries(
    functionsWithWebsocketYamlFiles.map(f => [f, true])
  );

  const functionsWithWebsocketMiddleware = Object.values(
    template.template.Resources
  )
    .filter(r => r.Type == RESOURCE_TYPE_FUNCTION)
    .map(r => ({
      name: r.Properties["CodeUri"]?.[KEYWORD_SOMOD_FUNCTION]?.name || "",
      middlewares: (r.Properties["CodeUri"]?.[KEYWORD_SOMOD_FUNCTION]?.[
        "middlewares"
      ] || []) as { module?: string; resource: string }[]
    }))
    .filter(f => {
      return !f.middlewares.every(
        m =>
          !(
            m.module == SOMOD_WEBSOCKET_EXTENSION &&
            m.resource == "SomodWebSocketMiddleware"
          )
      );
    })
    .map(f => f.name);

  const functionsWithWebsocketMiddlewareMap = Object.fromEntries(
    functionsWithWebsocketMiddleware.map(f => [f, true])
  );

  const functionsWithNoFile = functionsWithWebsocketMiddleware.filter(
    f => !functionsWithWebsocketYamlFilesMap[f]
  );

  if (functionsWithNoFile.length > 0) {
    throw new Error(
      `Error: Following functions does not have .websocket.yaml files (from ${SOMOD_WEBSOCKET_EXTENSION})\n${functionsWithNoFile
        .map(f => ` ${f}`)
        .join("\n")}`
    );
  }

  const functionsWithNoMiddleware = functionsWithWebsocketYamlFiles.filter(
    f => !functionsWithWebsocketMiddlewareMap[f]
  );

  if (functionsWithNoMiddleware.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      chalk.yellow(
        `Warning: Following functions does not have SomodWebSocketMiddleware (from ${SOMOD_WEBSOCKET_EXTENSION})\n${functionsWithNoMiddleware
          .map(f => ` ${f}`)
          .join("\n")}`
      )
    );
  }
};

export const prebuild: Extension["prebuild"] = async context => {
  await validateWebsocketYamlFilesForMiddlewares(context);
  await validateWebsocketYamlFilesSchema(context);
};
