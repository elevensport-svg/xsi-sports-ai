export type SportsNewsCategory =
  | "MLB"
  | "NBA"
  | "足球"
  | "電競";

export type SportsNewsItem = {
  id: string;
  category: SportsNewsCategory;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  image?: string;
};

type EspnArticle = {
  id?: number | string;
  headline?: string;
  description?: string;
  published?: string;
  links?: {
    web?: {
      href?: string;
    };
  };
  images?: Array<{
    url?: string;
  }>;
};

type EspnResponse = {
  articles?: EspnArticle[];
};

type MyMemoryResponse = {
  responseData?: {
    translatedText?: string;
  };
};

/* ==========================================
   免費翻譯
========================================== */

async function translateText(
  text: string,
): Promise<string> {
  if (!text.trim()) {
    return "";
  }

  try {
    const safeText =
      text.length > 350
        ? text.slice(0, 350)
        : text;

    const params =
      new URLSearchParams({
        q: safeText,
        langpair: "en|zh-TW",
      });

    const response =
      await fetch(
        `https://api.mymemory.translated.net/get?${params.toString()}`,
        {
          next: {
            revalidate: 86400,
          },
        },
      );

    if (!response.ok) {
      console.warn(
        "MyMemory 翻譯失敗:",
        response.status,
      );

      return text;
    }

    const data =
      (await response.json()) as MyMemoryResponse;

    const translated =
      data.responseData
        ?.translatedText
        ?.trim();

    if (!translated) {
      return text;
    }

    return translated;
  } catch (error) {
    console.warn(
      "MyMemory 翻譯發生錯誤:",
      error,
    );

    return text;
  }
}

/* ==========================================
   翻譯新聞
========================================== */

async function translateNews(
  title: string,
  description: string,
) {
  const [
    translatedTitle,
    translatedDescription,
  ] = await Promise.all([
    translateText(title),
    translateText(description),
  ]);

  return {
    title: translatedTitle,
    description:
      translatedDescription,
  };
}

/* ==========================================
   ESPN 新聞
========================================== */

async function getEspnNews(
  league: string,
  category: SportsNewsCategory,
): Promise<SportsNewsItem[]> {
  try {
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/${league}/news`;

    const response =
      await fetch(url, {
        next: {
          revalidate: 1800,
        },
      });

    if (!response.ok) {
      console.warn(
        `ESPN ${category} news error:`,
        response.status,
      );

      return [];
    }

    const data =
      (await response.json()) as EspnResponse;

    const sourceArticles =
      (data.articles ?? [])
        .slice(0, 4);

    const translatedArticles =
      await Promise.all(
        sourceArticles.map(
          async (
            article,
            index,
          ) => {
            const originalTitle =
              article.headline ??
              "最新體育新聞";

            const originalDescription =
              article.description ??
              "";

            const translation =
              await translateNews(
                originalTitle,
                originalDescription,
              );

            return {
              id:
                String(
                  article.id ?? "",
                ) ||
                `${category}-${index}`,

              category,

              title:
                translation.title,

              description:
                translation.description,

              url:
                article.links?.web
                  ?.href ??
                "#",

              source:
                "ESPN",

              publishedAt:
                article.published ??
                new Date().toISOString(),

              image:
                article.images?.[0]
                  ?.url,
            } satisfies SportsNewsItem;
          },
        ),
      );

    return translatedArticles;
  } catch (error) {
    console.warn(
      `讀取 ${category} 新聞失敗:`,
      error,
    );

    return [];
  }
}

/* ==========================================
   首頁新聞
========================================== */

export async function getSportsNews(): Promise<
  SportsNewsItem[]
> {
  const [
    mlb,
    nba,
    football,
  ] = await Promise.all([
    getEspnNews(
      "baseball/mlb",
      "MLB",
    ),

    getEspnNews(
      "basketball/nba",
      "NBA",
    ),

    getEspnNews(
      "soccer/eng.1",
      "足球",
    ),
  ]);

  return [
    ...mlb,
    ...nba,
    ...football,
  ]
    .filter(
      (article) =>
        article.title &&
        article.url !== "#",
    )
    .sort(
      (a, b) =>
        new Date(
          b.publishedAt,
        ).getTime() -
        new Date(
          a.publishedAt,
        ).getTime(),
    )
    .slice(0, 12);
}