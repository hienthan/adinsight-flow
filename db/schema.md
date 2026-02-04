platforms
  id: text
  key: text
  name: text
  base_url: url
  default_language: text

pages
  id: text
  platform: relation
  canonical_id: text
  language: text
  languages: json
  content_type: select (activity, hotel, restaurant, event, poi, blog, other)
  url: url
  slug: text
  sitemap_tag: text
  country: text
  city: text
  category_hint: text
  is_private: bool
  tier: select
  translated_title_vi: text
  include_for_dsa: bool
  exclude_for_dsa: bool
  sitemap_priority: number
  sitemap_lastmod: date
  metadata: json
  created: autodate
  updated: autodate

platform_metadata
  id: text
  platform: relation
  type: select (country, city, category, sitemap_tag)
  value: text
  count: number

url_patterns
  id: text
  platform_id: relation
  pattern: text
  category: select
  default_tier: number
  status: select

exports
  id: text
  name: text
  platform: relation
  country: text
  city: text
  tier: number
  result_text: text
  total_count: number
