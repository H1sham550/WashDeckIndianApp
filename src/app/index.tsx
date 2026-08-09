import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Image,
  Platform,
  StatusBar,
  Linking,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';

const PROD_URL = 'https://wash-deck-india.vercel.app';
const DEV_LOCAL_URL = 'http://localhost:3000';
const DEV_LAN_URL = 'http://192.168.1.3:3000';

// Default to lightning-fast Vercel CDN production URL for instant startup
const INITIAL_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || PROD_URL;

const PRIMARY_COLOR = '#0b2240'; // WashDeck Navy
const ACCENT_COLOR = '#1771f2';  // WashDeck Electric Blue
const BG_COLOR = '#F8F9FA';      // WashDeck Page Background

// Modern 3-Dot Wave Bouncing Loading Animation
const DotWaveLoader = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounceAnim = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -14,
            duration: 320,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 320,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createBounceAnim(dot1, 0);
    const anim2 = createBounceAnim(dot2, 160);
    const anim3 = createBounceAnim(dot3, 320);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={styles.waveLoaderContainer}>
      <Animated.View style={[styles.waveDot, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[styles.waveDot, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[styles.waveDot, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const initialLoadDoneRef = useRef(false);

  // WebView state
  const [canGoBack, setCanGoBack] = useState(false);
  const [targetUrl, setTargetUrl] = useState(INITIAL_URL);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);

  // Ref to hold latest canGoBack state for the Android back press listener
  const canGoBackRef = useRef(false);
  useEffect(() => {
    canGoBackRef.current = canGoBack;
  }, [canGoBack]);

  // Guaranteed Safety Dismiss Timer: hide loading screen after 1500ms max
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
      initialLoadDoneRef.current = true;
    }, 1500);
    return () => clearTimeout(safetyTimer);
  }, [targetUrl]);

  // Handle hardware back button on Android safely with subtab priority to /dashboard
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            var activeCloseBtn = document.querySelector('[data-modal-close-btn]');
            if (activeCloseBtn) {
              activeCloseBtn.click();
              return;
            }
            var path = window.location.pathname;
            if (path.startsWith('/dashboard/') && path !== '/dashboard/' && path !== '/dashboard') {
              try { sessionStorage.setItem('just_returned_root', 'true'); } catch(e) {}
              window.location.href = '/dashboard';
              return;
            }
            if (path.startsWith('/admin/') && path !== '/admin/' && path !== '/admin') {
              try { sessionStorage.setItem('just_returned_root', 'true'); } catch(e) {}
              window.location.href = '/admin';
              return;
            }
            window.dispatchEvent(new Event('popstate'));
          })();
          true;
        `);
        return true;
      }
      return true;
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandlerSubscription.remove();
  }, []);

  // Monitor network status silently
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      setIsConnected(connected);
      if (!connected) {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Retry loading the website — explicitly re-verify network state before hiding offline UI
  const handleRetry = async () => {
    const state = await NetInfo.fetch();
    const connected = Boolean(state.isConnected && (state.isInternetReachable ?? true));
    setIsConnected(connected);

    if (!connected) {
      setErrorOccurred(false);
      setIsLoading(false);
      return;
    }

    setErrorOccurred(false);
    setIsLoading(true);
    setTriedFallback(false);
    setTargetUrl(INITIAL_URL);
    webViewRef.current?.reload();
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    if (navState.url.includes('/login') || navState.url.includes('logged_out')) {
      webViewRef.current?.injectJavaScript(`
        document.cookie = "washdeck_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        sessionStorage.clear();
        localStorage.clear();
        true;
      `);
    }
  };

  const handleShouldStartLoad = (event: any) => {
    const url = event.url;
    if (
      url.startsWith('whatsapp://') ||
      url.startsWith('https://wa.me') ||
      url.startsWith('https://api.whatsapp.com') ||
      url.startsWith('tel:') ||
      url.startsWith('mailto:') ||
      url.startsWith('geo:')
    ) {
      Linking.openURL(url).catch(() => { });
      return false;
    }
    return true;
  };

  const handleLoadError = () => {
    if (!triedFallback && targetUrl !== PROD_URL) {
      console.log('Local dev URL unreachable, attempting production fallback:', PROD_URL);
      setTriedFallback(true);
      setTargetUrl(PROD_URL);
    } else {
      setErrorOccurred(true);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: targetUrl }}
          style={[styles.webview, (errorOccurred || !isConnected) && { opacity: 0 }]}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'PAGE_READY' || data.type === 'DOM_READY') {
                initialLoadDoneRef.current = true;
                setIsLoading(false);
                setErrorOccurred(false);
              }
              if (data.type === 'LOGOUT') {
                webViewRef.current?.clearCache?.(true);
                webViewRef.current?.injectJavaScript(`
                  document.cookie = "washdeck_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  sessionStorage.clear();
                  localStorage.clear();
                  true;
                `);
              }
            } catch (e) { }
          }}
          onLoadStart={() => {
            if (isConnected && !errorOccurred && !initialLoadDoneRef.current) {
              setIsLoading(true);
            }
          }}
          onLoadEnd={() => {
            initialLoadDoneRef.current = true;
            setIsLoading(false);
          }}
          onError={handleLoadError}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) {
              handleLoadError();
            }
          }}
          renderError={() => <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />}
          androidLayerType="hardware"
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          allowFileAccess={true}
          allowFileAccessFromFileURLs={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          pullToRefreshEnabled={true}
          allowsBackForwardNavigationGestures={true}
          textZoom={100}
          injectedJavaScript={`
            window.isNativeApp = true;
            if (document.readyState === 'complete') {
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'DOM_READY' }));
            } else {
              window.addEventListener('load', function() {
                window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'DOM_READY' }));
              });
            }
            true;
          `}
        />

        {isLoading && !errorOccurred && isConnected && (
          <View style={styles.loadingContainer} pointerEvents="none">
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../assets/app_logo.png')}
                style={styles.loadingLogo}
                resizeMode="contain"
              />
              <DotWaveLoader />
            </View>
          </View>
        )}

        {(!isConnected || errorOccurred) && (
          <View style={styles.errorContainer}>
            <Image
              source={require('../../assets/app_logo.png')}
              style={styles.errorLogo}
              resizeMode="contain"
            />
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Connection Lost</Text>
              <Text style={styles.errorSubtitle}>
                {!isConnected
                  ? 'Please check your internet connection and try again.'
                  : 'Unable to connect to the WashDeck server.'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingLogo: {
    width: 260,
    height: 80,
    marginBottom: 16,
  },
  waveLoaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 30,
  },
  waveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ACCENT_COLOR,
    shadowColor: ACCENT_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 200,
  },
  errorLogo: {
    width: 240,
    height: 75,
    marginBottom: 32,
    alignSelf: 'center',
  },
  errorCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: BG_COLOR,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
