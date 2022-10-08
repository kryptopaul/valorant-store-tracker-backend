const axios = require('axios');
const {wrapper} = require('axios-cookiejar-support');
const {CookieJar} = require('tough-cookie');

//Setup a Cookie Jar and wrap Axios
const jar = new CookieJar();
const client = wrapper(axios.create({jar}));

// Request Cookies for the first request
const getCookiesData = {
	"client_id": "play-valorant-web-prod",
	"nonce": "1",
	"redirect_uri": "https://playvalorant.com/opt_in",
	"response_type": "token id_token"
}

// Parses the token from the uri
function parseToken(uri) {
	let token = uri.replace('https://playvalorant.com/opt_in#access_token=', '')
	token = token.split('&scope=openid')[0]
	return token
}


module.exports = async function loginAndFetch(login, password) {
    try{
        //Make sure we start with clear cookies
        await jar.removeAllCookies();
        //Ask for the cookies
        await client.post('https://auth.riotgames.com/api/v1/authorization/', getCookiesData, {
            withCreditentials: true
        });
        // Authenticate using the cookies from the first request and pass the login data
        const authCookiesData = {
            "type": "auth",
            "username": login,
            "password": password,
            "remember": true,
            "language": "en_US"
        }
        //Authenticate the cookies
        const authCookies = await client.put('https://auth.riotgames.com/api/v1/authorization/', authCookiesData, {
            withCreditentials: true
        });
        //Parse the token fron the link
        const parsedToken = parseToken(authCookies.data.response.parameters.uri)
        //Grab the X-Riot-Entitlements-JWT (entitlement)
        const entitlement = await client.post('https://entitlements.auth.riotgames.com/api/token/v1', {
            withCreditentials: true
        }, {
            headers: {
                'Authorization': `Bearer ${parsedToken}`
            }
        });
        const entitlementToken = entitlement.data.entitlements_token
        //Grab the player UUID
        const playerUUID = await client.get('https://auth.riotgames.com/userinfo/', {
            headers: {
                'Authorization': `Bearer ${parsedToken}`
            }
        });
        const parsedPlayerUUID = playerUUID.data.sub

        authObject = {
            'token': parsedToken,
            'entitlement': entitlementToken,
            'playerUUID': parsedPlayerUUID
        }
        // We're ready at this point - time to grab the skins

        const storeItems = await axios.get(`https://pd.eu.a.pvp.net/store/v2/storefront/${authObject.playerUUID}`, {headers: {'Authorization': `Bearer ${authObject.token}`, 'X-Riot-Entitlements-JWT': authObject.entitlement}});
        const dailySkins = storeItems.data.SkinsPanelLayout.SingleItemOffers;

        // Let's match the skin IDs against their names, prices and images
        const dailyShop = [];

        //Skin Names and Images from unofficial API
        const theLargeSkinDataSetReq = await axios.get(`https://valorant-api.com/v1/weapons/skinlevels/`)
        const theLargeSkinDataSet = theLargeSkinDataSetReq.data.data

        //Latest skin Prices from official Riot API
        const theLargePriceDataSetReq = await axios.get('https://pd.eu.a.pvp.net/store/v1/offers/', {headers: {'Authorization': `Bearer ${authObject.token}`, 'X-Riot-Entitlements-JWT': authObject.entitlement}})
        const theLargePriceDataSet = theLargePriceDataSetReq.data.Offers

        await dailySkins.forEach(element => {
            theLargePriceDataSet.forEach(priceDatasetObject => {
                if (element == priceDatasetObject.OfferID) {
                    theLargeSkinDataSet.forEach(skinDataSetObject => {
                        if (element == skinDataSetObject.uuid) {
                            const skin = {
                                'id': element,
                                'name': skinDataSetObject.displayName,
                                'price': priceDatasetObject.Cost['85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741'],
                                'image': skinDataSetObject.displayIcon
                            }
                            const discordEmbedObject = {
                                "title": `✨ ${skin.name}`,
                                "description": `💸 ${skin.price} VP`,
                                "color": 7018936,
                                "image": {
                                    "url": `${skin.image}`
                                }
                            }
                            dailyShop.push(skin)
                            
                        }
                    })
                }
            })
        });
        console.log(dailyShop)
        return dailyShop
    } catch (error) {
        console.log('Error! Is your password right?' + error)
    }
}
