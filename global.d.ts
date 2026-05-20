declare module '*.css';

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
    [key: string]: string | undefined;
  }
}

declare const process: { env: NodeJS.ProcessEnv };
