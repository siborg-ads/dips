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
      schema.integrations[slug].adParameters.map((a) =>
        a.variants && a.variants.length
          ? `${a.slug}-${a.variants.map((v) => v.defaultValue).join('-')}`
          : a.slug
      ) || []
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

function fromAdParametersToIntegrations(adParameters) {
  const adParametersAvailable = {}
  const allowedIntegrations = []

  for (let adParameter of adParameters) {
    const split = adParameter.split('-')
    const base = split[0]

    if (!adParametersAvailable[base]) {
      adParametersAvailable[base] = []
    }
    adParametersAvailable[base].push(adParameter)

    for (let i = 1; i < split.length; i++) {
      const variant = split[i]
      if (
        schema.adParameters[base] &&
        schema.adParameters[base].variants.length
      ) {
        for (const { variantRegExp } of schema.adParameters[base].variants) {
          const regex = new RegExp(variantRegExp)
          if (regex.test(variant)) {
            const key = `${base}-${variantRegExp}`
            if (!adParametersAvailable[key]) {
              adParametersAvailable[key] = []
            }
            adParametersAvailable[key].push(adParameter)
          }
        }
      }
    }
  }

  for (const integrationSlug of Object.keys(schema.integrations)) {
    const requiredAdParameters = []
    for (const { slug, variants } of schema.integrations[integrationSlug]
      .adParameters) {
      if (variants && variants.length) {
        for (const { variantRegExp } of variants) {
          requiredAdParameters.push(`${slug}-${variantRegExp}`)
        }
      } else {
        requiredAdParameters.push(slug)
      }
    }
    let isAvailable = true
    const adParametersAvailableForIntegration = []

    for (const requiredAdParameter of requiredAdParameters) {
      if (!adParametersAvailable[requiredAdParameter]) {
        isAvailable = false
        break
      } else {
        adParametersAvailableForIntegration.push(
          ...adParametersAvailable[requiredAdParameter]
        )
      }
    }

    if (isAvailable) {
      allowedIntegrations.push({
        adParameters: adParametersAvailableForIntegration,
        integrationSlug,
        integration: schema.integrations[integrationSlug]
      })
    }
  }

  return allowedIntegrations
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

// adParameters: ["imageURL-6.4:1", "linkURL"]
console.log(
  'fromIntegrationsToAdParameters(["DynamicBanner-fromContext"]) ',
  fromIntegrationsToAdParameters(['DynamicBanner-fromContext'])
)

// adParameters: [ 'imageURL-6.4:1', 'linkURL', 'xCreatorHandle', 'xSpaceId' ]
console.log(
  'fromIntegrationsToAdParameters(["DynamicBanner-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"]) ',
  fromIntegrationsToAdParameters([
    'DynamicBanner-fromContext',
    'xCreatorHighlight-fromContext',
    'xSpaceHighlight-fromContext'
  ])
)

// DynamicBanner, ClickableLogosGrid, LogosGrid, xCreatorHighlight
console.log(
  'fromAdParametersToIntegrations(["imageURL-5:5", "linkURL", "xCreatorHandle"])',
  fromAdParametersToIntegrations(['imageURL-5:5', 'linkURL', 'xCreatorHandle'])
)

// {  maxSupply: 10,  allowedTokenIds: [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["LogosGrid"], 10) ',
  fromIntegrationsToSupplyRestrictions(['LogosGrid'], 10)
)

//  { maxSupply: 4, allowedTokenIds: [ 14, 18, 15, 25 ] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["DynamicBanner"], 4, [14,18,15,25]) ',
  fromIntegrationsToSupplyRestrictions(['DynamicBanner'], 4, [14, 18, 15, 25])
)

// { maxSupply: 115792089237316195423570985008687907853269984665640564039457584007913129639935, allowedTokenIds: [] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["DynamicBanner-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"]) ',
  fromIntegrationsToSupplyRestrictions([
    'DynamicBanner-fromContext',
    'xCreatorHighlight-fromContext',
    'xSpaceHighlight-fromContext'
  ])
)

// { maxSupply: 115792089237316195423570985008687907853269984665640564039457584007913129639935, allowedTokenIds: [1,2,3] }
console.log(
  'fromIntegrationsToSupplyRestrictions(["DynamicBanner-fromContext","xCreatorHighlight-fromContext", "xSpaceHighlight-fromContext"], 10, [1,2,3]) ',
  fromIntegrationsToSupplyRestrictions(
    [
      'DynamicBanner-fromContext',
      'xCreatorHighlight-fromContext',
      'xSpaceHighlight-fromContext'
    ],
    undefined,
    [1, 2, 3]
  )
)
