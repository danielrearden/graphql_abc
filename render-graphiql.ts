export function renderGraphiQL(
  queryString?: string,
  defaultQuery?: string,
  variables?: Record<string, any>,
  operationName?: string,
  result: any = null,
) {
  const variablesString = variables ? JSON.stringify(variables, null, 2) : null;
  const resultString = result ? JSON.stringify(result, null, 2) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GraphiQL</title>
  <meta name="robots" content="noindex" />
  <meta name="referrer" content="origin" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      overflow: hidden;
    }
    #graphiql {
      height: 100vh;
    }
  </style>
  
  <script src="//unpkg.com/promise-polyfill@8.1.3/dist/polyfill.min.js"></script>
  <script src="//unpkg.com/unfetch@4.1.0/dist/unfetch.umd.js"></script>
  <script src="//unpkg.com/react@16.13.1/umd/react.production.min.js"></script>
  <script src="//unpkg.com/react-dom@16.13.1/umd/react-dom.production.min.js"></script>
  <script src="//unpkg.com/graphiql-explorer@0.6.2/graphiqlExplorer.min.js"></script>
  <script src="//unpkg.com/graphiql@0.17.5/graphiql.min.js"></script>

  <link type="text/css" href="//unpkg.com/graphiql@0.17.5/graphiql.min.css" rel="stylesheet" />
</head>
<body>
  <div id="graphiql">Loading...</div>
  <script>
    // Collect the URL parameters
    var parameters = {};
    window.location.search.substr(1).split('&').forEach(function (entry) {
      var eq = entry.indexOf('=');
      if (eq >= 0) {
        parameters[decodeURIComponent(entry.slice(0, eq))] =
          decodeURIComponent(entry.slice(eq + 1));
      }
    });
    // Produce a Location query string from a parameter object.
    function locationQuery(params) {
      return '?' + Object.keys(params).filter(function (key) {
        return Boolean(params[key]);
      }).map(function (key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(params[key]);
      }).join('&');
    }
    // Derive a fetch URL from the current URL, sans the GraphQL parameters.
    var graphqlParamNames = {
      query: true,
      variables: true,
      operationName: true
    };
    var otherParams = {};
    for (var k in parameters) {
      if (parameters.hasOwnProperty(k) && graphqlParamNames[k] !== true) {
        otherParams[k] = parameters[k];
      }
    }
    var fetchURL = locationQuery(otherParams);
    // Defines a GraphQL fetcher using the fetch API.
    function graphQLFetcher(graphQLParams) {
      return fetch(fetchURL, {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphQLParams),
        credentials: 'include',
      }).then(function (response) {
        return response.json();
      });
    }
    // When the query and variables string is edited, update the URL bar so
    // that it can be easily shared.
    function onEditQuery(newQuery) {
      parameters.query = newQuery;
      updateURL();
    }
    function onEditVariables(newVariables) {
      parameters.variables = newVariables;
      updateURL();
    }
    function onEditOperationName(newOperationName) {
      parameters.operationName = newOperationName;
      updateURL();
    }
    function updateURL() {
      history.replaceState(null, null, locationQuery(parameters));
    }
    // Render <GraphiQL /> into the body.
    ReactDOM.render(
      React.createElement(GraphiQL, {
        fetcher: graphQLFetcher,
        onEditQuery: onEditQuery,
        onEditVariables: onEditVariables,
        onEditOperationName: onEditOperationName,
        query: ${safeSerialize(queryString)},
        response: ${safeSerialize(resultString)},
        variables: ${safeSerialize(variablesString)},
        operationName: ${safeSerialize(operationName)},
        defaultQuery: ${safeSerialize(defaultQuery)},
      }),
      document.getElementById('graphiql')
    );
  </script>
</body>
</html>
`;
}

function safeSerialize(data: any) {
  return data != null
    ? JSON.stringify(data).replace(/\//g, "\\/")
    : "undefined";
}
