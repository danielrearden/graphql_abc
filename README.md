## GraphQL ABC

This is a deno module for creating a GraphQL endpoint. This is largely a port of [express-graphql](https://github.com/graphql/express-graphql). It provides middleware to an existing [abc](https://github.com/zhmushan/abc) application instance.

### Usage

Create a new [abc](https://github.com/zhmushan/abc) Application, then just call `applyMiddleware` passing in the `Application` instance and a `GraphQLSchema` instance.

```ts
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "https://cdn.pika.dev/graphql@^15.0.0";
import { Application } from "https://deno.land/x/abc@v1.0.0-rc8/mod.ts";
import { applyMiddleware } from "https://raw.githubusercontent.com/danielrearden/graphql-middleware/master/mod.ts";

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: () => ({
      hello: {
        type: GraphQLString,
        resolve: () => "Hello World!",
      },
    }),
  }),
});

const app = new Application();

applyMiddleware({ app, schema });

app.start({ port: 4000 });
```

### Configuration

```ts
export interface GraphQLMiddlewareOptions {
  /**
   * ABC Application to which apply the middleware
   */
  app: Application;

  /**
   * The route path for the GraphQL endpoint. Defaults to "/graphql".
   */
  path?: string;

  /**
   * A boolean to optionally enable GraphiQL mode.
   * Alternatively, instead of `true` you can pass in an options object.
   */
  graphiql?: boolean | GraphiQLOptions;

  /**
   * The schema against which queries will be executed.
   */
  schema: GraphQLSchema;

  /**
   * An object to pass as the root value.
   */
  rootValue?: any;

  /**
   * The value to be used as the context provided to the schema's resolvers.
   * If a function is provided, it will be passed the ABC Context as a parameter.
   * The function may return a Promise. If no value is provided, the ABC Context will be used.
   */
  context?: GraphQLContext;

  /**
   * A resolver function to use when one is not provided by the schema.
   * If not provided, the default field resolver is used (which looks for a
   * value or method on the source value with the field's name).
   */
  fieldResolver?: GraphQLFieldResolver<any, any>;

  /**
   * A type resolver function to use when none is provided by the schema.
   * If not provided, the default type resolver is used (which looks for a
   * `__typename` field or alternatively calls the `isTypeOf` method).
   */
  typeResolver?: GraphQLTypeResolver<any, any>;

  /**
   * An optional array of validation rules that will be applied on the document
   * in additional to those defined by the GraphQL spec.
   */
  validationRules?: ReadonlyArray<(ctx: ValidationContext) => ASTVisitor>;

  /**
   * An optional function which will be used to validate instead of default `validate`
   * from `graphql-js`.
   */
  validateFn?: (
    schema: GraphQLSchema,
    documentAST: DocumentNode,
    rules: ReadonlyArray<ValidationRule>,
  ) => ReadonlyArray<GraphQLError>;

  /**
   * An optional function which will be used to execute instead of default `execute`
   * from `graphql-js`.
   */
  executeFn?: (args: ExecutionArgs) => Promise<ExecutionResult>;

  /**
   * An optional function which will be used to format any errors produced by
   * fulfilling a GraphQL operation. If no function is provided, GraphQL's
   * default spec-compliant `formatError` function will be used.
   */
  formatErrorFn?: (error: GraphQLError) => any;

  /**
   * An optional function which will be used to create a document instead of
   * the default `parse` from `graphql-js`.
   */
  parseFn?: (source: Source) => DocumentNode;
}

export interface GraphiQLOptions {
  /**
   * An optional GraphQL string to use when no query is provided and no stored
   * query exists from a previous session.  If undefined is provided, GraphiQL
   * will use its own default query.
   */
  defaultQuery?: string;
}
```
