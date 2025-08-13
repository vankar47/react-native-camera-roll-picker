import React, { Component } from "react";
import {
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  View,
} from "react-native";
import FastImage from "react-native-fast-image";
import PropTypes from "prop-types";

const checkIcon = require("./circle-check.png");

const styles = StyleSheet.create({
  marker: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "transparent",
  },
  whiteBorder: {
    backgroundColor: "rgba(25, 25, 27, 0.7)",
    borderWidth: 3,
    borderColor: "#006FF0",
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: Dimensions.get("window").width * 0.02,
  },
});

class ImageItem extends Component {
  componentWillMount() {
    let { width } = Dimensions.get("window");
    const { imageMargin, imagesPerRow, containerWidth } = this.props;

    if (typeof containerWidth !== "undefined") {
      width = containerWidth;
    }
    this.imageSize = (width - (imagesPerRow + 9) * imageMargin) / imagesPerRow;
  }

  shouldComponentUpdate(nextProps) {
    const { uri, selected } = this.props;
    return uri !== nextProps.uri || selected !== nextProps.selected;
  }

  handleClick(item) {
    this.props.onClick(item);
  }

  render() {
    const {
      item,
      selected,
      selectedMarker,
      imageMargin,
      uri,
      VideoMarker,
      isDisabled,
    } = this.props;

    const image = item.node;

    const marker = <View style={selected && styles.whiteBorder} />;
    const videoInfo =
      image.image.playableDuration !== undefined &&
      image.image.playableDuration > 0 ? (
        <VideoMarker duration={image.image.playableDuration} />
      ) : null;

    return (
      <>
        <TouchableOpacity
          disabled={isDisabled}
          style={{
            marginBottom: imageMargin + 3,
            marginRight: imageMargin + 3,
          }}
          onPress={() => this.handleClick(image)}
        >
          {Platform.OS === "ios" ? (
            <Image
              source={{ uri }}
              style={{
                height: this.imageSize,
                width: this.imageSize,
                borderRadius: Dimensions.get("window").width * 0.02,
              }}
            />
          ) : (
            <FastImage
              source={{ uri }}
              style={{
                height: this.imageSize,
                width: this.imageSize,
                borderRadius: Dimensions.get("window").width * 0.02,
              }}
            />
          )}
          {selected ? marker : null}
          {videoInfo}
        </TouchableOpacity>
      </>
    );
  }
}

ImageItem.defaultProps = {
  item: {},
  selected: false,
  selectedMarker: null,
  VideoMarker: null,
};

ImageItem.propTypes = {
  uri: PropTypes.string.isRequired,
  item: PropTypes.object,
  selected: PropTypes.bool,
  selectedMarker: PropTypes.element,
  VideoMarker: PropTypes.element,
  imageMargin: PropTypes.number,
  imagesPerRow: PropTypes.number,
  onClick: PropTypes.func,
};

export default ImageItem;
