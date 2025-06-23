"use strict";

export class GraphQLClient {
  constructor(endpoint, headers = {}) {
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  async query(query, variables = {}) {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw error;
    }
  }

  async mutation(mutation, variables = {}) {
    return this.query(mutation, variables);
  }
}

// Create a default client instance
export const graphqlClient = new GraphQLClient(process.env.GRAPHQL_ENDPOINT, {
  'Authorization': `Bearer ${process.env.GRAPHQL_TOKEN}`,
}); 