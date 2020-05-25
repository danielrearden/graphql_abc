import {
  assert,
  assertEquals,
} from "https://deno.land/std/testing/asserts.ts";
import {
  Application,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "../deps.ts";
import {
  applyMiddleware,
  GraphQLMiddlewareOptions,
} from "../mod.ts";

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

const withApplication = (
  cb: () => Promise<void>,
  options: Partial<GraphQLMiddlewareOptions>,
) => {
  return async function () {
    const app = new Application();
    let error: Error | undefined = undefined;

    applyMiddleware({ app, schema, ...options });

    app.start({ port: 4000 });

    try {
      await cb();
    } catch (e) {
      error = e;
    }

    await app.close();

    if (error) {
      throw error;
    }
  };
};

Deno.test(
  "POST with default options",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify({ query: "{hello}" }),
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, { hello: "Hello World!" });
    assertEquals(errors, undefined);
  }, {}),
);

Deno.test(
  "POST with wrong content type",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/xml" },
        body: JSON.stringify({ query: "{hello}" }),
      },
    );
    const { message } = await res.json();
    assertEquals(res.status, 400);
    assertEquals(
      message,
      "Invalid Content-Type header. Only application/json is supported.",
    );
  }, {}),
);

Deno.test(
  "GET with default options",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql?query={hello}",
      {
        method: "GET",
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, { hello: "Hello World!" });
    assertEquals(errors, undefined);
  }, {}),
);

Deno.test(
  "GET from browser",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql?query={hello}",
      {
        method: "GET",
        headers: { ["accept"]: "text/html" },
      },
    );
    const text = await res.text();
    assert(text.includes("React.createElement(GraphiQL"));
  }, {}),
);

Deno.test(
  "GET with raw parameter",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql?query={hello}&raw=true",
      {
        method: "GET",
        headers: { ["accept"]: "text/html" },
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, { hello: "Hello World!" });
    assertEquals(errors, undefined);
  }, {}),
);

Deno.test(
  "GET with no GraphiQL",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql?query={hello}",
      {
        method: "GET",
        headers: { ["accept"]: "text/html" },
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, { hello: "Hello World!" });
    assertEquals(errors, undefined);
  }, { graphiql: false }),
);

Deno.test(
  "variables and multiple operations",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify({
          query: `
            query Query1($skip: Boolean!) {
              hello @skip(if: $skip)
            }

            query Query2($skip: Boolean!) {
              hello @skip(if: $skip)
            }
          `,
          variables: { skip: true },
          operationName: "Query2",
        }),
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, {});
    assertEquals(errors, undefined);
  }, {}),
);

Deno.test(
  "context",
  withApplication(
    async () => {
      const res = await fetch(
        "http://localhost:4000/graphql?name=Daenerys",
        {
          method: "POST",
          headers: { ["content-type"]: "application/json" },
          body: JSON.stringify({ query: "{hello}" }),
        },
      );
      const { data, errors } = await res.json();
      assertEquals(data, { hello: "Hello, Daenerys!" });
      assertEquals(errors, undefined);
    },
    {
      schema: new GraphQLSchema(
        {
          query: new GraphQLObjectType({
            name: "Query",
            fields: {
              hello: {
                type: GraphQLString,
                resolve: (_root, _args, ctx) => `Hello, ${ctx.name}!`,
              },
            },
          }),
        },
      ),
      context: ({ queryParams }) => ({ name: queryParams.name }),
    },
  ),
);

Deno.test(
  "invalid document",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify({ query: "{hellooo}" }),
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, undefined);
    assertEquals(
      errors[0].message,
      `Cannot query field "hellooo" on type "Query". Did you mean "hello"?`,
    );
  }, {}),
);

Deno.test(
  "syntax error",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify({ query: "{{hello}" }),
      },
    );
    const { data, errors } = await res.json();
    assertEquals(data, undefined);
    assertEquals(
      errors[0].message,
      `Syntax Error: Expected Name, found "{".`,
    );
  }, {}),
);

Deno.test(
  "context function error",
  withApplication(async () => {
    const res = await fetch(
      "http://localhost:4000/graphql",
      {
        method: "POST",
        headers: { ["content-type"]: "application/json" },
        body: JSON.stringify({ query: "{hello}" }),
      },
    );
    const { data, errors } = await res.json();
    console.log("***", errors);
    assertEquals(data, undefined);
    assertEquals(
      errors[0].message,
      "Ooops!",
    );
  }, {
    context: () => {
      throw new Error("Ooops!");
    },
  }),
);

Deno.test(
  "invalid schema",
  withApplication(
    async () => {
      const res = await fetch(
        "http://localhost:4000/graphql",
        {
          method: "POST",
          headers: { ["content-type"]: "application/json" },
          body: JSON.stringify({ query: "{hello}" }),
        },
      );
      const { data, errors } = await res.json();
      assertEquals(data, undefined);
      assertEquals(
        errors[0].message,
        "Type Query must define one or more fields.",
      );
    },
    {
      schema: new GraphQLSchema(
        { query: new GraphQLObjectType({ name: "Query", fields: {} }) },
      ),
    },
  ),
);
