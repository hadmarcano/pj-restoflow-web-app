declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test';
    REACT_APP_API_URL?: string;
    REACT_APP_GOOGLE_CLIENT_ID?: string;
  }
}
