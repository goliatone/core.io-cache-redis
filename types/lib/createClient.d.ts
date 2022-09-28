export = createClient;
/**
 * Create a new redis client.
 *
 * @param {Object} config Configuration options
 * @returns
 */
declare function createClient(config?: {
    url: string;
    port: number;
    host: string;
    tls: boolean;
    showFriendlyErrorStack: boolean;
}): any;
