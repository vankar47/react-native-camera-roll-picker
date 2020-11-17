import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import CameraRoll from "@react-native-community/cameraroll";
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
      loading: false,
    };

    this.renderFooterSpinner = this.renderFooterSpinner.bind(this);
    this.onEndReached = this.onEndReached.bind(this);
    this.selectImage = this.selectImage.bind(this);
    this.renderImage = this.renderImage.bind(this);
    this._handleScroll = this._handleScroll.bind(this);
  }

  componentWillMount() {
    this.fetch();
  }

  onEndReached() {
    if (!this.state.noMore) {
      this.fetch();
    }
  }

  appendImages(data, operation) {
    const { images } = this.state;
    const assets = data.edges;
    const newState = {
      loadingMore: false,
      initialLoading: false,
    };



    if (!data.page_info.has_next_page) {
      newState.noMore = true;
    }
    
    if(operation === 'refresh') {
      if (!data.page_info.has_next_page) {
        newState.noMore = true;
      } else {
        newState.noMore = false;
      }
    }

    if (assets.length > 0) {
      newState.lastCursor = data.page_info.end_cursor;
      newState.images = operation == 'refresh' ? [].concat(assets) :images.concat(assets);
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
    const { first = 10, groupTypes, assetType, mimeTypes, sort_by = '' } = this.props;

    const fetchParams = {
      first,
      groupTypes,
      assetType,
      mimeTypes,
      ...{sort_by}
    };
    if (Platform.OS === 'android') {
      // not supported in android
      delete fetchParams.groupTypes;
    }

    if (this.state.lastCursor) {
      fetchParams.after = this.state.lastCursor;
    }

    fetchParams.include = ['filename', 'fileSize', 'location']

    CameraRoll.getPhotos(fetchParams)
      .then(data => {
        return this.appendImages(data, '');
      }, e => console.log(e));
  }

  _refreshControl(fetchParams) {
    this.setState({
      loading: true
    })
    if (Platform.OS === 'android') {
      // not supported in android
      delete fetchParams.groupTypes;
    }
    fetchParams.include = ['filename', 'fileSize', 'location']
    CameraRoll.getPhotos(fetchParams)
      .then(data => {
        this.setState({
          loading: false
        })
        return this.appendImages(data, 'refresh');
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
        playableDuration: image.image.playableDuration,
        name: image.image.filename,
        fileSize: image.image.fileSize,
        exif: 'location' in image ? image.location: null
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
      VideoMarker,
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
        VideoMarker={VideoMarker}
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

  _handleScroll (event) {
    if(event.nativeEvent.contentOffset.y < 5) {
      this.props.topBarNotifier && this.props.topBarNotifier({yOffset: event.nativeEvent.contentOffset.y })
    }   
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
        onScroll={this._handleScroll}
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
        refreshControl={<RefreshControl
          refreshing={this.state.loading}
          onRefresh={()=> {
            const {first = 10, groupTypes, assetType, mimeTypes, sort_by} = this.props;
            this._refreshControl({
              assetType, 
              first, 
              mimeTypes,
              groupTypes,
              sort_by
            })
          }}
        />}
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
  VideoMarker: PropTypes.element,
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
