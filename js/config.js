// Site settings you may want to change without touching the game code.

export const CONFIG = {
  /**
   * Satellite photos for the ground and rooftops.
   *
   * The default provider is Esri World Imagery, which needs a free API key:
   *   1. Create a free ArcGIS Location Platform account at https://location.arcgis.com/
   *   2. Create an API key with the privilege "Location services > Basemaps".
   *   3. Under the key's referrers, allow https://peopleofpanvel.com
   *   4. Paste the key between the quotes below and commit.
   *
   * The key is meant to be public (every visitor's browser uses it), which is why
   * step 3 matters: it stops anyone else using your allowance.
   * With no key, the town uses its drawn ground and roof textures.
   */
  imagery: {
    key: 'AAPTaXpoEVB0ddz_OVbqjUtpAtQ..kGOk9lpqPpytr4I3SFhPVNJNmwyW2B8oq9zpwqwRiVxEdpun2mQJ1UydTMYldBeHXa-1cESr_b5sAXShVIErK-TOpZwnzazuYpa064wysCrpYrsAld-gO9G3x4P9RWIZt3OTUMao8lk5RMrbYzvfc6fe0AinHeKDZ_66R4t-VkvVCFWRbLVecZ5-IdWcHzp43PU6Kv3LaddlgVdorXaw9zRQPvhAskCiqfoA9oHK9JJW0hvWfGyOGRCKAT1_6hYBMapa',
    // {z} {x} {y} are the usual web-map tile numbers; {key} is the key above.
    url: 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token={key}',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics · Powered by Esri',
    // Tile zoom per graphics tier. 18 is about half a metre per pixel; 17 is about one metre.
    zoom: { low: 17, medium: 18, high: 18 },
  },
};
