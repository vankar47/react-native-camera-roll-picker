import React, { Component } from 'react';
import {
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import FastImage from 'react-native-fast-image'
import PropTypes from 'prop-types';

const checkIcon = require('./circle-check.png');

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'transparent',
  },
});

class ImageItem extends Component {
  componentWillMount() {
    let { width } = Dimensions.get('window');
    const { imageMargin, imagesPerRow, containerWidth } = this.props;

    if (typeof containerWidth !== 'undefined') {
      width = containerWidth;
    }
    this.imageSize = (width - (imagesPerRow + 1) * imageMargin) / imagesPerRow;
  }

  shouldComponentUpdate(nextProps) {
    const { uri, selected } = this.props;
    return uri !== nextProps.uri || selected !== nextProps.selected
  }

  handleClick(item) {
    this.props.onClick(item);
  }

  render() {
    const {
      item, selected, selectedMarker, imageMargin,
      uri,
      VideoMarker,
    } = this.props;

    const image = item.node;

    const marker = selectedMarker || (
      <Image
        style={[styles.marker, { width: 25, height: 25 }]}
        source={checkIcon}
      />
    );
    const videoInfo = (image.image.playableDuration !== undefined && image.image.playableDuration > 0)
      ? (
        <VideoMarker duration={image.image.playableDuration} />
      )
      : null;

    return (
      <TouchableOpacity
        style={{ marginBottom: imageMargin, marginRight: imageMargin }}
        onPress={() => this.handleClick(image)}
      >
        <FastImage
          source={{ uri }}
          style={{ height: this.imageSize, width: this.imageSize }}
        />
        {(selected) ? marker : null}
        {videoInfo}
      </TouchableOpacity>
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
