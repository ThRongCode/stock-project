import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Since we're working with a REST API, we'll use Apollo Client with fetch
const httpLink = createHttpLink({
  uri: 'https://api.hsx.vn/mk/api/v1/market/', // Base URL
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

export default client; 