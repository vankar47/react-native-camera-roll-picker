import React, { Component } from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import PropTypes from "prop-types";

import ImageItem from "./ImageItem";

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
  },
  loader: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
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

  componentDidUpdate(prevProps) {
    if (prevProps.selectedAlbum !== this.props.selectedAlbum) {
      this.setState(
        {
          images: [],
          data: [],
          lastCursor: null,
          noMore: false,
          initialLoading: true,
        },
        () => this.doFetch()
      );
    }
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

    if (!data.page_info.has_next_page || assets.length <= 1) {
      newState.noMore = true;
    }

    if (operation === "refresh") {
      if (!data.page_info.has_next_page) {
        newState.noMore = true;
      } else {
        newState.noMore = false;
      }
    }

    if (assets.length > 0) {
      newState.lastCursor = data.page_info.end_cursor;
      newState.images =
        operation == "refresh" ? [].concat(assets) : images.concat(assets);
      newState.data = newState.images;
    }

    this.setState(newState);
  }

  fetch() {
    if (!this.state.loadingMore) {
      this.setState({ loadingMore: true }, () => {
        this.doFetch();
      });
    }
  }

  doFetch() {
    const {
      first = 10,
      groupTypes,
      assetType,
      mimeTypes,
      sort_by = "",
      selectedAlbum,
    } = this.props;
    const fetchParams = {
      first,
      groupTypes,
      assetType,
      mimeTypes,
      ...{ sort_by },
    };
    if (selectedAlbum && selectedAlbum !== "Albums") {
      fetchParams.groupName = selectedAlbum;
      fetchParams.groupTypes = "Album";
    }
    if (Platform.OS === "android") {
      delete fetchParams.groupTypes;
    }
    if (this.state.lastCursor) {
      fetchParams.after = this.state.lastCursor;
    }
    fetchParams.include = ["filename", "fileSize", "imageSize"];

    CameraRoll.getPhotos(fetchParams).then(
      (data) => {
        if (assetType === "Videos" && Platform.OS === "ios") {
          const filteredVideoArray = data.edges.filter(
            (x) => x.node.type === "video"
          );
          if (filteredVideoArray.length === 1) {
            data.page_info.has_next_page = false;
          }
          return this.appendImages({ ...data, edges: filteredVideoArray }, "");
        }
        return this.appendImages(data, "");
      },
      (e) => console.log(e)
    );
  }

  _refreshControl(fetchParams) {
    this.setState({
      loading: true,
    });
    if (Platform.OS === "android") {
      delete fetchParams.groupTypes;
    }
    try {
      fetchParams.include = ["filename", "fileSize", "imageSize"];
      // Add this block to filter by selected album
      if (this.props.selectedAlbum && this.props.selectedAlbum !== "Albums") {
        fetchParams.groupName = this.props.selectedAlbum;
        fetchParams.groupTypes = "Album";
      } else {
        delete fetchParams.groupName;
        delete fetchParams.groupTypes;
      }
    } catch (error) {
      console.log("Error in RN camera roll picker", error);
    }
    CameraRoll.getPhotos(fetchParams).then(
      (data) => {
        this.setState({
          loading: false,
        });
        return this.appendImages(data, "refresh");
      },
      (e) => console.log(e)
    );
  }

  reset() {
    this.setState({
      selected: [],
    });
  }

  selectImage(image) {
    const { selected, images } = this.state;
    const { callback, maximumErrorHandler, maximum } = this.props;

    const isDeSelected = this.deSelectImage(image.image);
    if (isDeSelected) return false;

    if (selected.length >= maximum) {
      if (maximumErrorHandler) maximumErrorHandler();
      return;
    }
    const newSelected = [
      ...selected,
      {
        height: image.image.height,
        uri: image.image.uri,
        width: image.image.width,
        type: image.type,
        playableDuration: image.image.playableDuration,
        name: image.image.filename,
        fileSize: image.image.fileSize,
        exif: "location" in image ? image.location : null,
      },
    ];

    this.setState({
      selected: newSelected,
      data: images,
    });

    callback(newSelected, image);
  }

  deSelectImage(media) {
    const { onMediaDeselected, callback } = this.props;
    const { selected, images } = this.state;

    const isAlreadySelected = selected.find((item) => item.uri === media.uri);
    if (isAlreadySelected) {
      // remove from array
      const newSelected = selected.filter((item) => item.uri !== media.uri);

      this.setState({
        selected: newSelected,
        data: images,
      });

      if (onMediaDeselected) {
        onMediaDeselected(media);
      } else {
        // support old system
        callback(newSelected, media);
      }
      return true;
    }

    return false; // wasn't selected
  }

  renderImage(item) {
    const { selected } = this.state;
    const {
      imageMargin,
      selectedMarker,
      imagesPerRow,
      containerWidth,
      VideoMarker,
      isDisabled,
    } = this.props;

    const { uri } = item.node.image;
    const isSelected =
      selected.find((i) => i.uri === item.node.image.uri) !== undefined;

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
        isDisabled={isDisabled}
      />
    );
  }

  renderFooterSpinner() {
    if (!this.state.noMore) {
      return <ActivityIndicator style={styles.spinner} />;
    }
    return null;
  }

  _handleScroll(event) {
    this.props.topBarNotifier && this.props.topBarNotifier(true);
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
      ImageIcon,
    } = this.props;

    if (this.state.initialLoading) {
      return (
        <View style={[styles.loader, { backgroundColor }]}>
          {loader || <ActivityIndicator />}
        </View>
      );
    }

    const flatListOrEmptyText =
      this.state.data.length > 0 ? (
        <FlatList
          style={{ flex: 1 }}
          onTouchMove={this._handleScroll}
          ListFooterComponent={this.renderFooterSpinner}
          onEndReached={this.onEndReached}
          renderItem={({ item }) => this.renderImage(item)}
          keyExtractor={(item) => item.node.image.uri}
          data={this.state.data}
          numColumns={imagesPerRow}
          extraData={this.state.selected}
          onEndReachedThreshold={0.7}
          windowSize={9}
          maxToRenderPerBatch={9}
          initialNumToRender={initialNumToRender}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={10}
          refreshControl={
            <RefreshControl
              refreshing={this.state.loading}
              onRefresh={() => {
                const {
                  first = 10,
                  groupTypes,
                  assetType,
                  mimeTypes,
                  sort_by,
                } = this.props;
                this._refreshControl({
                  assetType,
                  first,
                  mimeTypes,
                  groupTypes,
                  sort_by,
                });
              }}
            />
          }
        />
      ) : (
        <>
          <ImageIcon />
          <Text style={[{ textAlign: "center" }, emptyTextStyle]}>
            {emptyText}
          </Text>
        </>
      );

    return (
      <View
        style={[
          styles.wrapper,
          { padding: imageMargin, paddingRight: 0, backgroundColor },
          this.state.data.length <= 0 && {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {flatListOrEmptyText}
      </View>
    );
  }
}

CameraRollPicker.propTypes = {
  initialNumToRender: PropTypes.number,
  groupTypes: PropTypes.oneOf([
    "Album",
    "All",
    "Event",
    "Faces",
    "Library",
    "PhotoStream",
    "SavedPhotos",
  ]),
  maximum: PropTypes.number,
  maximumErrorHandler: PropTypes.func,
  assetType: PropTypes.oneOf(["Photos", "Videos", "All"]),
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
  // emptyTextStyle: Text.propTypes.style,
  loader: PropTypes.node,
};

CameraRollPicker.defaultProps = {
  initialNumToRender: 5,
  groupTypes: "SavedPhotos",
  maximum: 15,
  imagesPerRow: 3,
  imageMargin: 5,
  selectSingleItem: false,
  assetType: "Photos",
  backgroundColor: "white",
  selected: [],
  callback(selectedImages, currentImage) {
    console.log(currentImage);
    console.log(selectedImages);
  },
  maximumErrorHandler() {},
  emptyText: "No photos.",
};

export default CameraRollPicker;
