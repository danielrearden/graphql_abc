import {
  Application,
} from "https://deno.land/x/abc@v1.0.0-rc8/mod.ts";
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "https://cdn.pika.dev/graphql@^15.0.0";

import { applyMiddleware } from "../mod.ts";

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

console.log("Started server");
