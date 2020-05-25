import {
  formatError,
  execute,
  parse,
  specifiedRules,
  validate,
  validateSchema,
  Accepts,
  Context,
  DocumentNode,
  GraphQLError,
  HttpException,
  Source,
} from "./deps.ts";
import { GraphQLMiddlewareOptions } from "./types.ts";
import { renderGraphiQL } from "./render-graphiql.ts";

export function applyMiddleware(options: GraphQLMiddlewareOptions) {
  const {
    app,
    path = "/graphql",
    graphiql = true,
    schema,
    rootValue,
    fieldResolver,
    typeResolver,
    validationRules = [],
    validateFn = validate,
    executeFn = execute,
    formatErrorFn = formatError,
    parseFn = parse,
  } = options;
  const defaultQuery = typeof graphiql === "object"
    ? graphiql.defaultQuery
    : undefined;

  const processRequest = async (
    context: Context,
    query: string,
    variableValues?: Record<string, any>,
    operationName?: string,
  ) => {
    if (!query) {
      throw new HttpException("Must provide query string.", 400);
    }

    const result = await executeQuery(
      context,
      query,
      variableValues,
      operationName,
    );

    if ("validationErrors" in result) {
      throw new HttpException({ errors: result.validationErrors }, 400);
    } else if ("serverErrors" in result) {
      throw new HttpException(
        { errors: result.serverErrors.map(({ message }) => ({ message })) },
        500,
      );
    } else {
      return {
        data: result.data,
        errors: result.errors ? result.errors.map(formatErrorFn) : undefined,
      };
    }
  };

  const executeQuery = async (
    context: Context,
    query: string,
    variableValues?: Record<string, any>,
    operationName?: string,
  ): Promise<
    | { serverErrors: readonly Error[] }
    | { validationErrors: readonly GraphQLError[] }
    | {
      data:
        | {
          [key: string]: any;
        }
        | null
        | undefined;
      errors: readonly GraphQLError[] | undefined;
    }
  > => {
    // validateSchema caches the result so it will not be validated on every request
    const schemaValidationErrors = validateSchema(schema);
    if (schemaValidationErrors.length) {
      return { validationErrors: schemaValidationErrors };
    }

    const source = new Source(query);
    let document: DocumentNode;

    try {
      document = parseFn(source);
    } catch (syntaxError) {
      return { validationErrors: [syntaxError] };
    }

    const validationErrors = validateFn(
      schema,
      document,
      [...specifiedRules, ...validationRules],
    );

    if (validationErrors.length > 0) {
      return { validationErrors };
    }

    let contextValue: any;

    try {
      contextValue = typeof options.context === "function"
        ? await options.context(context)
        : options.context || context;
    } catch (error) {
      return { serverErrors: [error] };
    }

    let { data, errors } = await executeFn({
      schema,
      document,
      rootValue,
      contextValue,
      variableValues,
      operationName,
      fieldResolver,
      typeResolver,
    });

    if (errors) {
      errors = errors.map(formatErrorFn);
    }

    return { data, errors };
  };

  const graphqlMiddleware = async (context: Context) => {
    const accept = new Accepts(context.request.headers);
    const acceptedTypes = accept.types(["json", "html"]);

    if (context.method === "POST") {
      const contentType = context.request.headers.get("content-type");

      if (contentType !== "application/json") {
        throw new HttpException(
          `Invalid Content-Type header. Only application/json is supported.`,
          400,
        );
      }

      const { query, variables, operationName } = await context.body();
      return processRequest(
        context,
        query,
        variables,
        operationName,
      );
    } else if (context.method === "GET") {
      const { query, variables, operationName } = context.queryParams;
      const variableValues = variables ? JSON.parse(variables) : undefined;
      const showGraphiQL = graphiql && !context.queryParams.raw &&
        acceptedTypes[0] === "html";

      if (showGraphiQL) {
        let result: any = null;
        if (query || defaultQuery) {
          const executionResult = await executeQuery(
            context,
            query || defaultQuery || "",
            variableValues,
            operationName,
          );
          if ("validationErrors" in executionResult) {
            result = { errors: executionResult.validationErrors };
          } else if ("serverErrors" in executionResult) {
            result = {
              errors: executionResult.serverErrors.map(({ message }) => ({
                message,
              })),
            };
          } else {
            result = executionResult;
          }
        }

        return renderGraphiQL(
          query,
          defaultQuery,
          variableValues,
          operationName,
          result,
        );
      } else {
        return processRequest(
          context,
          query,
          variableValues,
          operationName,
        );
      }
    } else {
      throw new HttpException(`Unsupported method: ${context.method}`, 400);
    }
  };

  app.post(path, graphqlMiddleware);
  app.get(path, graphqlMiddleware);
}
