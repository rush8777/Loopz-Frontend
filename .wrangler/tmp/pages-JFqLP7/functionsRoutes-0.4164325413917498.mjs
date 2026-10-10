import { onRequestPost as __api_waitlist_ts_onRequestPost } from "C:\\Users\\ASUS\\Downloads\\latest-fullstack\\Loopz-Frontend\\functions\\api\\waitlist.ts"

export const routes = [
    {
      routePath: "/api/waitlist",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_waitlist_ts_onRequestPost],
    },
  ]