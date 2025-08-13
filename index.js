import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Platform,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  CameraRoll,
  cameraRollEventEmitter,
} from "@react-native-camera-roll/camera-roll";
import PropTypes from "prop-types";
import ImageItem from "./ImageItem";
import { FlashList } from "@shopify/flash-list";

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
  },
  loader: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinner: {
    marginVertical: 10,
  },
});

function CameraRollPicker(props) {
  const {
    initialNumToRender,
    imageMargin,
    backgroundColor,
    emptyText,
    emptyTextStyle,
    loader,
    imagesPerRow,
    ImageIcon,
    groupTypes,
    maximum,
    maximumErrorHandler,
    assetType,
    selectSingleItem,
    containerWidth,
    callback,
    selected: selectedProp,
    selectedMarker,
    VideoMarker,
    emptyText: emptyTextProp,
  } = props;

  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(selectedProp || []);
  const [lastCursor, setLastCursor] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const subscriptionRef = useRef(null);

  // Helper to append images
  const appendImages = useCallback(
    (data, operation) => {
      const assets = data.edges;
      let newImages = images;
      let newNoMore = noMore;
      let newLastCursor = lastCursor;

      if (!data.page_info.has_next_page || assets.length <= 1) {
        newNoMore = true;
      }

      if (operation === "refresh") {
        newNoMore = !data.page_info.has_next_page ? true : false;
        newImages = [].concat(assets);
      } else if (assets.length > 0) {
        newLastCursor = data.page_info.end_cursor;
        newImages = images.concat(assets);
      }

      setLastCursor(newLastCursor);
      setImages(newImages);
      setData(newImages);
      setLoadingMore(false);
      setInitialLoading(false);
      setNoMore(newNoMore);
    },
    [images, lastCursor, noMore]
  );

  // Fetch images
  const doFetch = useCallback(() => {
    const {
      first = 10,
      groupTypes,
      assetType,
      mimeTypes,
      sort_by = "",
      selectedAlbum,
    } = props;
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
    if (lastCursor) {
      fetchParams.after = lastCursor;
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
          appendImages({ ...data, edges: filteredVideoArray }, "");
        } else {
          appendImages(data, "");
        }
      },
      (e) => console.log(e)
    );
  }, [appendImages, lastCursor, props]);

  // Initial fetch and subscription
  useEffect(() => {
    setInitialLoading(true);
    doFetch();

    if (subscriptionRef.current) subscriptionRef.current.remove();
    if (parseInt(Platform.Version, 10) > 14) {
      subscriptionRef.current = cameraRollEventEmitter.addListener(
        "onLibrarySelectionChange",
        (_event) => {
          doFetch();
        }
      );
    }
    return () => {
      if (subscriptionRef.current && parseInt(Platform.Version, 10) > 14)
        subscriptionRef.current.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selectedAlbum]);

  // Handle prop change for selected
  useEffect(() => {
    setSelected(selectedProp || []);
  }, [selectedProp]);

  // End reached handler
  const onEndReached = useCallback(() => {
    if (!noMore) {
      setLoadingMore(true);
      doFetch();
    }
  }, [noMore, doFetch]);

  // Refresh control handler
  const _refreshControl = useCallback(
    (fetchParams) => {
      setLoading(true);
      if (Platform.OS === "android") {
        delete fetchParams.groupTypes;
      }
      try {
        fetchParams.include = ["filename", "fileSize", "imageSize"];
        if (props.selectedAlbum && props.selectedAlbum !== "Albums") {
          fetchParams.groupName = props.selectedAlbum;
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
          setLoading(false);
          appendImages(data, "refresh");
        },
        (e) => console.log(e)
      );
    },
    [appendImages, props.selectedAlbum]
  );

  // Select image
  const selectImage = useCallback(
    (image) => {
      const isDeSelected = deSelectImage(image.image);
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

      setSelected(newSelected);
      setData(images);

      callback(newSelected, image);
    },
    [selected, maximum, maximumErrorHandler, callback, images]
  );

  // Deselect image
  const deSelectImage = useCallback(
    (media) => {
      const isAlreadySelected = selected.find((item) => item.uri === media.uri);
      if (isAlreadySelected) {
        const newSelected = selected.filter((item) => item.uri !== media.uri);
        setSelected(newSelected);
        setData(images);

        if (props.onMediaDeselected) {
          props.onMediaDeselected(media);
        } else {
          callback(newSelected, media);
        }
        return true;
      }
      return false;
    },
    [selected, images, callback, props.onMediaDeselected]
  );

  // Render image
  const renderImage = useCallback(
    (item) => {
      const isSelected =
        selected.find((i) => i.uri === item.node.image.uri) !== undefined;

      return (
        <ImageItem
          key={item.node.image.uri}
          uri={item.node.image.uri}
          item={item}
          selected={isSelected}
          imageMargin={imageMargin}
          selectedMarker={selectedMarker}
          VideoMarker={VideoMarker}
          imagesPerRow={imagesPerRow}
          containerWidth={containerWidth}
          onClick={selectImage}
          isDisabled={props.isDisabled}
        />
      );
    },
    [
      selected,
      imageMargin,
      selectedMarker,
      VideoMarker,
      imagesPerRow,
      containerWidth,
      selectImage,
      props.isDisabled,
    ]
  );

  // Footer spinner
  const renderFooterSpinner = useCallback(() => {
    if (!noMore) {
      return <ActivityIndicator style={styles.spinner} />;
    }
    return null;
  }, [noMore]);

  // Handle scroll
  const _handleScroll = useCallback(
    (event) => {
      props.topBarNotifier && props.topBarNotifier(true);
    },
    [props.topBarNotifier]
  );

  if (initialLoading) {
    return (
      <View style={[styles.loader, { backgroundColor }]}>
        {loader || <ActivityIndicator />}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        { padding: imageMargin, paddingRight: 0, backgroundColor },
        data.length <= 0 && {
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {data.length > 0 ? (
        <FlashList
          contentContainerStyle={{ flex: 1 }}
          onTouchMove={_handleScroll}
          ListFooterComponent={renderFooterSpinner}
          onEndReached={onEndReached}
          renderItem={({ item }) => renderImage(item)}
          keyExtractor={(item) => item.node.image.uri}
          data={data}
          numColumns={imagesPerRow}
          extraData={selected}
          onEndReachedThreshold={0.7}
          windowSize={9}
          maxToRenderPerBatch={9}
          initialNumToRender={initialNumToRender}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={10}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                const {
                  first = 10,
                  groupTypes,
                  assetType,
                  mimeTypes,
                  sort_by,
                } = props;
                _refreshControl({
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
            {emptyTextProp}
          </Text>
        </>
      )}
    </View>
  );
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
  emptyTextStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
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
