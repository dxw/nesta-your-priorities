const { SitemapStream, streamToPromise } = require("sitemap");
const { Readable } = require("stream");
const log = require("./logger.cjs");

var generateSitemap = async function (req, res) {
  if (!req.ypDomain) {
    log.error("No domain found in sitemap generation");
    res.status(500).end();
    return;
  }

  const domainId = req.ypDomain.id;
  const domainName = req.ypDomain.domain_name;
  let siteHostname = "https://" + domainName;

  const redisKey = `cache:sitemap:v8:${siteHostname}-${domainId}`;

  try {
    const content = await req.redisClient.get(redisKey);
    if (content) {
      res.header("Content-Type", "application/xml");
      res.set({ "content-type": "application/xml" });
      res.send(content);
      return;
    }
    const sitemapStream = new SitemapStream({
      hostname: siteHostname,
      cacheTime: 1,
    });
    const xml = (
      await streamToPromise(
        Readable.from([ { url: "/" }, { url: "/group/1/new_post" } ]).pipe(
          sitemapStream
        )
      )
    ).toString();

    await req.redisClient.setEx(
      redisKey,
      process.env.SITEMAP_CACHE_TTL
        ? parseInt(process.env.SITEMAP_CACHE_TTL)
        : 60 * 60,
      xml
    );
    res.header("Content-Type", "application/xml");
    res.set({ "content-type": "application/xml" });
    res.send(xml);
  } catch (error) {
    log.error("Error from looking up sitemap data", { err: error });
    res.status(500).end();
  }
};

module.exports = generateSitemap;
