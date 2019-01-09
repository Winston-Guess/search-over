import React, { Component } from 'react';
import * as on from 'await-handler';
import GridList from '@material-ui/core/GridList';
import GridListTile from '@material-ui/core/GridListTile';
import GridListTileBar from '@material-ui/core/GridListTileBar';
import IntegrationAutosuggest from '../components/autosuggest.js';
import { withStyles } from '@material-ui/core/styles';

import 'typeface-roboto';
import './app.scss';

const styles = theme => ({
	root: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'space-around',
		overflow: 'hidden',
		backgroundColor: theme.palette.background.paper
	},
	gridList: {
		width: 500,
		height: 450
	},
	icon: {
		color: 'rgba(255, 255, 255, 0.54)'
	},
});

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			images: []
		};
	}

	async search(searchTerms) {
		let err, res, json;

		const url = 'https://api.unsplash.com/search/photos?';
		const clientID = '8dbebf7510c980a9ba6d0bf24df2c976f44e24669932eae317a0fcd77444fa12';
		const query = searchTerms.join(' ');

		[err, res] = await on(fetch(`${url}client_id=${clientID}&query=${query}`));
		if (err) {
			console.error(err);
			return;
		}

		[err, json] = await on(res.json());
		if (err) {
			console.error(err);
			return;
		}

		this.setState({ images: json.results });
	}

	render() {
		return (
			<div className='over-app'>
				<IntegrationAutosuggest
					search={(v) => this.search(v)}>
				</IntegrationAutosuggest>
				<GridList
					cellHeight={250}
					style={{ margin: '15px' }}
					className='grid-list'>
					{this.state.images.map(tile => (
						<GridListTile
							key={tile.id}
							style={{ padding: '5px' }}
							className='grid-tile'>
							<img src={tile.urls.small} alt={tile.id} />
							<GridListTileBar
								title={tile.description}
								subtitle={<span>by: {tile.user.name}</span>}
							/>
						</GridListTile>
					))}
				</GridList>
			</div>
		);
	}
}

export default withStyles(styles)(App);
