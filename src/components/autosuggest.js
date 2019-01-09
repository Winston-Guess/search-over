import React from 'react';
import PropTypes from 'prop-types';
import deburr from 'lodash/deburr';
import Autosuggest from 'react-autosuggest';
import match from 'autosuggest-highlight/match';
import parse from 'autosuggest-highlight/parse';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import MenuItem from '@material-ui/core/MenuItem';
import { withStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import HistoryIcon from '@material-ui/icons/History';
import DeleteIcon from '@material-ui/icons/Delete';
import InputAdornment from '@material-ui/core/InputAdornment';
import Chip from '@material-ui/core/Chip';

import './autosuggest.scss';

const styles = theme => ({
	container: {
		position: 'relative',
	},
	suggestionsContainerOpen: {
		position: 'absolute',
		zIndex: 1,
		marginTop: theme.spacing.unit,
		left: 0,
		right: 0,
	},
	suggestion: {
		display: 'block',
	},
	suggestionsList: {
		margin: 0,
		padding: 0,
		listStyleType: 'none',
	},
	divider: {
		height: theme.spacing.unit * 2,
	},
});

const renderHistoryText = (parts) => parts.map((part, index) => {
	const boldSpan = () => (
		<span key={String(index)} style={{ fontWeight: 500 }}>
			{part.text}
		</span>
	);

	const defaultSpan = () => (
		<strong key={String(index)} style={{ fontWeight: 300 }}>
			{part.text}
		</strong>
	);

	return part.highlight ? boldSpan() : defaultSpan();
})

const renderInputComponent = (inputProps) => {
	const {
		classes,
		value,
		inputRef = () => { },
		ref,
		flash,
		selectedItems,
		removeSearchTerm,
		handleSearch,
		openSuggestions,
		closeSuggestions,
		...other
	} = inputProps;

	const renderSelectedItems = () => selectedItems.map((item, index) => {
		const isColoured = flash[index] ? 'is-coloured' : ' '
		return (
			<Chip
				key={index}
				tabIndex={-1}
				label={item}
				className={'search-chip ' + isColoured }
				onDelete={removeSearchTerm(item)}
			></Chip>
		)
	});

	return (
		<TextField
			id="standard-dense"
			className='search-terms-field'
			value={value}
			tabIndex="0"
			fullWidth
			type="search"
			margin="dense"
			autoFocus
			InputProps={{
				inputRef: node => {
					ref(node);
					inputRef(node);
				},
				classes: {
					input: 'search-input-field',
				},
				onKeyDown: (ev) => handleSearch(ev, value),
				startAdornment:
					<InputAdornment position="start">
						{renderSelectedItems()}
					</InputAdornment>,
			}}
			{...other}
		></TextField>
	);
};

const resolver = () => Promise.resolve();

const asyncSleep = m => new Promise(r => setTimeout(r, m));

const getSuggestionValue = (suggestion) => {
	return suggestion;
}

class IntegrationAutosuggest extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			inputValue: '',
			doSearch: false,
			history: [],
			suggestions: [],
			selectedItems: [],
			flash: [],
			isSuggestionsVisible: true
		};

		this.removeHistoryTerm = false;
	}

	getSuggestions = (value) => {
		const inputValue = deburr(value.trim()).toLowerCase();
		const inputLength = inputValue.length;
		let count = 0;
		let suggestions = [...this.state.history];

		if (inputLength === 0) return suggestions;

		return suggestions.filter(suggestion => {
			suggestion = suggestion.slice(0, inputLength).toLowerCase();
			const keep = count < 5 && suggestion === inputValue;
			if (keep) count += 1;
			return keep;
		});
	}

	setColourAtIndex = async (index, isOn) => {
		const flash = this.state.selectedItems.map(() => false);
		flash[index] = isOn;
		this.setState({
			flash: flash
		}, resolver);
	};

	setSuggestionsVisibility = async (isSuggestionsVisible) => {
		this.setState({
			isSuggestionsVisible: isSuggestionsVisible
		}, resolver);
	};

	setSuggestions = async (suggestions) => {
		this.setState({
			suggestions: suggestions
		}, resolver);
	};

	setHistory = async (history) => {
		this.setState({
			history: history
		}, resolver);
	};

	setInputValue = async (value) => {
		this.setState({
			inputValue: value
		}, resolver);
	};

	addTermToHistory = async (value) => {
		if (this.state.history.indexOf(value) !== -1) return;
		this.setState({
			history: [value, ...this.state.history],
		}, resolver);
	};

	setSelectedItems = async (selectedItems) => {
		this.setState({
			selectedItems: selectedItems,
		}, resolver);
	};

	addTermToSearch = async (value) => {
		const selectedIndex = this.state.selectedItems.indexOf(value);
		if (selectedIndex !== -1) {
			await this.setColourAtIndex(selectedIndex, true);
			await asyncSleep(500);
			this.setColourAtIndex(selectedIndex, false);
			return;
		}
		const selectedItems = [...this.state.selectedItems, value];
		await this.setSelectedItems(selectedItems);
		this.props.search(selectedItems);
		this.setInputValue('');
	};

	handleEnterPress = async (value) => {
		if (value.split(' ').join('') === '') return;

		// onSuggestionSelected is called both when a suggestion
		// is selected or when the suggestion removal button is
		// selected. removeHistoryTerm is set to differentiate
		// between the two and is then reset afterward.
		if (this.removeHistoryTerm) {
			const input = this.state.inputValue;
			const history = [...this.state.history];
			history.splice(history.indexOf(this.removeHistoryTerm), 1);
			await this.setHistory(history)
			await this.setInputValue(input)
			this.setSuggestions(this.getSuggestions(input));
			this.removeHistoryTerm = undefined;
		} else {
			await this.addTermToSearch(value);
			await this.addTermToHistory(value);
			this.setSuggestions(this.getSuggestions(this.state.inputValue));
		}
	};

	handleBackspacePress = (value) => {
		if (value !== '') return;
		if (this.state.selectedItems.length === 0) return;

		const selectedItems = this.state.selectedItems.slice();
		selectedItems.pop();
		this.setSelectedItems(selectedItems);

		if (selectedItems.length === 0) return;
		this.props.search(selectedItems);
	};

	handleSearch = async (ev, value) => {
		if (ev.key === 'Enter') {
			this.handleEnterPress(value);
			ev.stopPropagation();
			ev.preventDefault();
		} else if (ev.key === 'Backspace') {
			this.handleBackspacePress(value);
		}
	};

	removeSearchTerm = item => async () => {
		const selectedItems = [...this.state.selectedItems];
		selectedItems.splice(selectedItems.indexOf(item), 1);
		await this.setSelectedItems(selectedItems);
		this.props.search(selectedItems);
		this.setSuggestions(this.getSuggestions(this.state.inputValue));
	};

	fetchSuggestions = ({ value }) => {
		this.setSuggestions(this.getSuggestions(value));
	};

	clearSuggestions = () => {
		this.setSuggestions([]);
	};

	handleInputChange = (_ev, { newValue }) => {
		this.setState({
			inputValue: newValue,
		});
	};

	setRemoveSuggestion = async (ev, suggestion) => {
		this.removeHistoryTerm = suggestion;
	};

	onSuggestionSelected = (_ev, { suggestion }) => {
		this.handleEnterPress(suggestion)
	};

	renderSuggestion = (suggestion, { query, isHighlighted }) => {
		const matches = match(suggestion, query);
		const parts = parse(suggestion, matches);
	
		return (
			<MenuItem selected={isHighlighted} component="div" disableRipple>
				<div style={{ width: '100%' }}>
					<IconButton disabled><HistoryIcon /></IconButton>
					{renderHistoryText(parts)}
					<IconButton
						style={{ float: 'right' }}
						onClick={(ev) => this.setRemoveSuggestion(ev, suggestion)}>
						<DeleteIcon />
					</IconButton>
				</div>
			</MenuItem>
		);
	};

	render() {
		const { classes } = this.props;

		const autosuggestProps = {
			renderInputComponent,
			suggestions: this.state.suggestions,
			onSuggestionSelected: this.onSuggestionSelected,
			onSuggestionsFetchRequested: this.fetchSuggestions,
			onSuggestionsClearRequested: this.clearSuggestions,
			renderSuggestion: this.renderSuggestion,
			getSuggestionValue,
		};
		
		return (
			<div
				className='auto-suggest'>
				<Autosuggest
					{...autosuggestProps}
					shouldRenderSuggestions={() => {
						return true;
					}}
					alwaysRenderSuggestions={false}
					focusInputOnSuggestionClick={true}
					inputProps={{
						classes,
						placeholder: 'Enter search term',
						inputRef: node => { // Todo: get input focus on ref working
							this.inputRef = node;
						},
						value: this.state.inputValue,
						onChange: this.handleInputChange,
						flash: this.state.flash,
						selectedItems: this.state.selectedItems,
						removeSearchTerm: this.removeSearchTerm,
						handleSearch: this.handleSearch,
					}}
					theme={{
						container: classes.container,
						suggestionsContainerOpen: classes.suggestionsContainerOpen,
						suggestionsList: classes.suggestionsList,
						suggestion: classes.suggestion,
					}}
					renderSuggestionsContainer={options => (
						<Paper
							style={{
								maxHeight: 200,
								overflow: 'auto',
								marginTop: '3px'
							}}
							square
							{...options.containerProps}
						>
							{options.children}
						</Paper>
					)}
				></Autosuggest>
			</div>
		);
	}
}

IntegrationAutosuggest.propTypes = {
	classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(IntegrationAutosuggest);