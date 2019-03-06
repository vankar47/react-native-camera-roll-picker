import React, { Component } from 'react';
import {
  CameraRoll,
  Platform,
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import PropTypes from 'prop-types';

import ImageItem from './ImageItem';

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
  },
  loader: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});


class CameraRollPicker extends Component {
  constructor(props) {
    super(props);

    this.state = {
      images: [],
      selected: props.selected,
      lastCursor: null,
      initialLoading: true,
      loadingMore: false,
      noMore: false,
      data: [],
    };

    this.renderFooterSpinner = this.renderFooterSpinner.bind(this);
    this.onEndReached = this.onEndReached.bind(this);
    this.selectImage = this.selectImage.bind(this);
    this.renderImage = this.renderImage.bind(this);
  }

  componentWillMount() {
    this.fetch();
  }

  onEndReached() {
    if (!this.state.noMore) {
      this.fetch();
    }
  }

  appendImages(data) {
    const { images } = this.state;
    const assets = data.edges;
    const newState = {
      loadingMore: false,
      initialLoading: false,
    };



    if (!data.page_info.has_next_page) {
      newState.noMore = true;
    }

    if (assets.length > 0) {
      newState.lastCursor = data.page_info.end_cursor;
      newState.images = images.concat(assets);
      newState.data = newState.images;
    }

    this.setState(newState);
  }

  fetch() {
    if (!this.state.loadingMore) {
      this.setState({ loadingMore: true }, () => { this.doFetch(); });
    }
  }

  doFetch() {
    const { first, groupTypes, assetType, mimeTypes } = this.props;

    const fetchParams = {
      first,
      groupTypes,
      assetType,
      mimeTypes,
    };

    if (Platform.OS === 'android') {
      // not supported in android
      delete fetchParams.groupTypes;
    }

    if (this.state.lastCursor) {
      fetchParams.after = this.state.lastCursor;
    }

    CameraRoll.getPhotos(fetchParams)
      .then(data => {
        return this.appendImages(data);
      }, e => console.log(e));
  }

  selectImage(image) {
    const { selected, images } = this.state;
    const {
      callback,
      maximum,
    } = this.props;

    const isAlreadySelected = selected.find(item => item.uri === image.image.uri);

    let newSelected = [];
    if (isAlreadySelected) {
      // remove from array 
      newSelected = selected.filter(item => item.uri !== image.image.uri);
    } else {
      if (selected.length >= maximum) {
        return;
      }
      newSelected = [...selected, {
        height: image.image.height,
        uri: image.image.uri,
        width: image.image.width,
        type: image.type,
      }];
    }

    this.setState({
      selected: newSelected,
      data: images,
    });

    callback(newSelected, image);
  }

  renderImage(item) {
    const { selected } = this.state;
    const {
      imageMargin,
      selectedMarker,
      imagesPerRow,
      containerWidth,
    } = this.props;

    const { uri } = item.node.image;
    const isSelected = selected.find(i => i.uri === item.node.image.uri) !== undefined;

    return (
      <ImageItem
        key={uri}
        uri={item.node.image.uri}
        item={item}
        selected={isSelected}
        imageMargin={imageMargin}
        selectedMarker={selectedMarker}
        imagesPerRow={imagesPerRow}
        containerWidth={containerWidth}
        onClick={this.selectImage}
      />
    );
  }

  renderFooterSpinner() {
    if (!this.state.noMore) {
      return <ActivityIndicator style={styles.spinner} />;
    }
    return null;
  }

  render() {
    const {
      initialNumToRender,
      imageMargin,
      backgroundColor,
      emptyText,
      emptyTextStyle,
      loader,
      imagesPerRow,
    } = this.props;

    if (this.state.initialLoading) {
      return (
        <View style={[styles.loader, { backgroundColor }]}>
          { loader || <ActivityIndicator /> }
        </View>
      );
    }

    const flatListOrEmptyText = this.state.data.length > 0 ? (
      <FlatList
        style={{ flex: 1 }}
        ListFooterComponent={this.renderFooterSpinner}
        onEndReached={this.onEndReached}
        renderItem={({ item }) => this.renderImage(item)}
        keyExtractor={item => item.node.image.uri}
        data={this.state.data}
        numColumns={imagesPerRow}
        extraData={this.state.selected}
        onEndReachedThreshold={0.7}
        windowSize={9}
        maxToRenderPerBatch={9}
        initialNumToRender={initialNumToRender}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={10}
      />
    ) : (
      <Text style={[{ textAlign: 'center' }, emptyTextStyle]}>{emptyText}</Text>
    );

    return (
      <View
        style={[styles.wrapper, { padding: imageMargin, paddingRight: 0, backgroundColor }]}
      >
        {flatListOrEmptyText}
      </View>
    );
  }
}

CameraRollPicker.propTypes = {
  initialNumToRender: PropTypes.number,
  groupTypes: PropTypes.oneOf([
    'Album',
    'All',
    'Event',
    'Faces',
    'Library',
    'PhotoStream',
    'SavedPhotos',
  ]),
  maximum: PropTypes.number,
  assetType: PropTypes.oneOf([
    'Photos',
    'Videos',
    'All',
  ]),
  selectSingleItem: PropTypes.bool,
  imagesPerRow: PropTypes.number,
  imageMargin: PropTypes.number,
  containerWidth: PropTypes.number,
  callback: PropTypes.func,
  selected: PropTypes.array,
  selectedMarker: PropTypes.element,
  backgroundColor: PropTypes.string,
  emptyText: PropTypes.string,
  emptyTextStyle: Text.propTypes.style,
  loader: PropTypes.node,
};

CameraRollPicker.defaultProps = {
  initialNumToRender: 5,
  groupTypes: 'SavedPhotos',
  maximum: 15,
  imagesPerRow: 3,
  imageMargin: 5,
  selectSingleItem: false,
  assetType: 'Photos',
  backgroundColor: 'white',
  selected: [],
  callback(selectedImages, currentImage) {
    console.log(currentImage);
    console.log(selectedImages);
  },
  emptyText: 'No photos.',
};

export default CameraRollPicker;
