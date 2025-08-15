import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    base: "/development-log/",
    lang: "ko-KR",

    title: "Development Log",
    description: "대충 끄적이는 개발 기록",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: "Home", link: "/" },
            { text: "Backend", link: "/docs/spring" },
        ],

        sidebar: [
            {
                text: "Backend",
                items: [{ text: "Spring Boot", link: "/docs/spring" }],
            },
        ],

        socialLinks: [{ icon: "github", link: "https://github.com/toothlessdev" }],
    },
});
