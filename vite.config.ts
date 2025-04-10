import {defineConfig} from "vite";
import fs from 'fs';
import path from 'path';

export default defineConfig(({ command }) => {
    if (command === 'serve') {
        const hasSSL = path.resolve(__dirname, './localhost-key.pem') && path.resolve(__dirname, './localhost.pem');
        if (hasSSL) {
            return {
                base: '/PuppetShow/',
                server: {
                    https: {
                        key: fs.readFileSync(path.resolve(__dirname, './localhost-key.pem')),
                        cert: fs.readFileSync(path.resolve(__dirname, './localhost.pem')),
                    },
                    // Make sure the server is accessible over the local network
                    host: '0.0.0.0',
                }
            }
        }

    }

    return {
        base: '/PuppetShow/',
    }
});
