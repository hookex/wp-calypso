/**
 * External dependencies
 */
import { createRegistryControl } from '@wordpress/data';
import { stringify } from 'qs';
import wpcomRequest, { reloadProxy, requestAllBlogsAccess } from 'wpcom-proxy-request';

/**
 * Internal dependencies
 */
import { FetchAuthOptionsAction, FetchWpLoginAction } from './actions';
import { STORE_KEY } from './constants';
import { WpcomClientCredentials } from '../shared-types';

export interface ControlsConfig extends WpcomClientCredentials {
	loadCookiesAfterLogin: boolean;
}

export function createControls( clientCreds: ControlsConfig ) {
	requestAllBlogsAccess().catch( () => {
		throw new Error( 'Could not get all blog access.' );
	} );
	return {
		SELECT_USERNAME_OR_EMAIL: createRegistryControl( registry => () => {
			return registry.select( STORE_KEY ).getUsernameOrEmail();
		} ),
		FETCH_AUTH_OPTIONS: async ( { usernameOrEmail }: FetchAuthOptionsAction ) => {
			const escaped = encodeURIComponent( usernameOrEmail );

			return await wpcomRequest( {
				path: `/users/${ escaped }/auth-options`,
				apiVersion: '1.1',
			} );
		},
		FETCH_WP_LOGIN: async ( { action, params }: FetchWpLoginAction ) => {
			const { client_id, client_secret, loadCookiesAfterLogin } = clientCreds;

			const response = await fetch(
				// TODO Wrap this in `localizeUrl` from lib/i18n-utils
				'https://wordpress.com/wp-login.php?action=' + encodeURIComponent( action ),
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: stringify( {
						remember_me: true,
						client_id,
						client_secret,
						...params,
					} ),
				}
			);

			if ( loadCookiesAfterLogin && response.ok ) {
				reloadProxy();
			}

			return {
				ok: response.ok,
				body: await response.json(),
			};
		},
	};
}
