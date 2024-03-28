const schema = require('./schema.json')

const MAX_UINT256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935

function getIntegrations(lang) {
  return Object.keys(schema.integrations).map((key) => {
    let { names, description, adParameters } = schema.integrations[key]
    const name = names[lang] || names.default
    const adParametersDetails = adParameters.map(({ slug, required }) => ({
      slug,
      required
    }))
    adParameters = adParameters.map(({ slug, required }) => slug)
    return { key, name, description, adParameters, adParametersDetails }
  })
}

// TODO: detect if several from same variant
function fromIntegrationsToAdParameters(integrationSlugs) {
  let adParameters = []
  let adParametersDetails = {}

  for (const integrationSlug of integrationSlugs) {
    const slug = integrationSlug.split('-')[0]
    const adParameterForIntegrations =
      schema.integrations[slug].adParameters.map((a) => a.slug) || []
    adParameters = adParameters.concat(adParameterForIntegrations)
  }

  const withVariants = {}

  for (let completeAdParameter of adParameters) {
    const split = completeAdParameter.split('-')

    const adParameter = split[0]

    if (!withVariants[adParameter]) {
      withVariants[adParameter] = []
    }

    if (split.length > 1) {
      for (let i = 1; i < split.length; i++) {
        const variant = split[i]
        withVariants[adParameter].push(variant)
      }
    }
  }

  adParameters = Object.keys(withVariants).map((adParameter) => {
    const variants = [...new Set(withVariants[adParameter])].sort()

    adParametersDetails[adParameter] = schema.adParameters[adParameter]

    return variants.length
      ? `${adParameter}-${variants.join('-')}`
      : adParameter
  })

  return { adParameters, adParametersDetails }
}

function fromIntegrationsToSupplyRestrictions(
  integrationSlugs,
  maxSupply = MAX_UINT256,
  allowedTokenIds = []
) {
  for (const integrationSlug of integrationSlugs) {
    const { allowedTokenIds: allowedTokenIdsIntegration } =
      _fromIntegrationToSupplyRestrictions(
        integrationSlug,
        maxSupply,
        allowedTokenIds
      )

    if (allowedTokenIds.length && allowedTokenIdsIntegration.length) {
      allowedTokenIds = allowedTokenIdsIntegration.filter((value) =>
        allowedTokenIds.includes(value)
      )
    } else {
      allowedTokenIds = allowedTokenIdsIntegration
    }
  }

  return { maxSupply, allowedTokenIds }
}

function _fromIntegrationToSupplyRestrictions(
  integrationSlug,
  maxSupply,
  allowedTokenIds
) {
  if (allowedTokenIds?.length > 0) {
    if (allowedTokenIds.length > maxSupply) throw 'Invalid tokenIds length'
  }

  if (integrationSlug.includes('fromContext') === false) {
    if (maxSupply > 10000) throw 'Invalid maxSupply'
    if (!allowedTokenIds.length)
      allowedTokenIds = Array.from({ length: maxSupply }, (_, i) => i)
  }

  return { maxSupply, allowedTokenIds }
}

console.log(
  'getIntegrations fr',
  JSON.stringify(getIntegrations('fr'), null, 2)
)
console.log(
  'getIntegrations en',
  JSON.stringify(getIntegrations('en'), null, 2)
)

// adParameters: ["imageURL-1:1", "linkURL"]
console.log(
  'fromIntegrationsToAdParameters(["ClickableLogosGrid"]) ',
  fromIntegrationsToAdParameters(['ClickableLogosGrid'])
)

// adParameters: ["imageURL", "linkURL"]
console.log(
  'fromIntegrationsToAdParameters(["BannerDynamic-fromContext"]) ',
  fromIntegrationsToAdParameters(['BannerDynamic-fromContext'])
)

// adParameters: [ 'imageURL', 'linkURL', 'xCreatorHandle', 'xSpaceId' ]
console.log(
  'fromIntegrationsToAdParameters(["BannerDynamic-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"]) ',
  fromIntegrationsToAdParameters([
    'BannerDynamic-fromContext',
    'xCreatorHighlight-fromContext',
    'xSpaceHighlight-fromContext'
  ])
)

// {  maxSupply: 10,  allowedTokenIds: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["LogosGrid"], 10) ',
  fromIntegrationsToSupplyRestrictions(['LogosGrid'], 10)
)

//  { maxSupply: 4, allowedTokenIds: [ 14, 18, 15, 25 ] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["BannerDynamic"], 4, [14,18,15,25]) ',
  fromIntegrationsToSupplyRestrictions(['BannerDynamic'], 4, [14, 18, 15, 25])
)

// { maxSupply: 115792089237316195423570985008687907853269984665640564039457584007913129639935, allowedTokenIds: [] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["BannerDynamic-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"]) ',
  fromIntegrationsToSupplyRestrictions([
    'BannerDynamic-fromContext',
    'xCreatorHighlight-fromContext',
    'xSpaceHighlight-fromContext'
  ])
)

// { maxSupply: 115792089237316195423570985008687907853269984665640564039457584007913129639935, allowedTokenIds: [1,2,3] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["BannerDynamic-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"], 10, [1,2,3]) ',
  fromIntegrationsToSupplyRestrictions(
    [
      'BannerDynamic-fromContext',
      'xCreatorHighlight-fromContext',
      'xSpaceHighlight-fromContext'
    ],
    undefined,
    [1, 2, 3]
  )
)
