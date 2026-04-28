import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function HistoryScreen() {
	const router = useRouter();

	const handleBottomNavPress = (key: string) => {
		if (key === "home") {
			router.replace("/homepage");
			return;
		}

		if (key === "history") {
			router.replace("/history");
			return;
		}

		if (key === "favorites") {
			router.replace("/loved");
			return;
		}

		if (key === "profile") {
			router.replace("/profile");
		}
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor="#05071A" />

			<View style={styles.header}>
				<Text style={styles.title}>History</Text>
				<Text style={styles.subtitle}>Your recent activity will appear here</Text>
			</View>

			<View style={styles.emptyState}>
				<Ionicons name="time-outline" size={52} color="#8f91aa" />
				<Text style={styles.emptyTitle}>No activity yet</Text>
				<Text style={styles.emptySubtitle}>
					Visit places and your viewed history will show in this tab.
				</Text>
			</View>

			<View style={styles.bottomNav}>
				<BlurView
					intensity={80}
					tint="light"
					style={StyleSheet.absoluteFillObject}
					pointerEvents="none"
				/>
				{[
					{ key: "home", icon: "home-outline" as const },
					{ key: "history", icon: "time-outline" as const },
					{ key: "favorites", icon: "heart-outline" as const },
					{ key: "profile", icon: "person-outline" as const },
				].map((item) => {
					const isActive = item.key === "history";
					return (
						<TouchableOpacity
							key={item.key}
							style={styles.navItem}
							onPress={() => handleBottomNavPress(item.key)}
							activeOpacity={0.7}
						>
							<Ionicons
								name={isActive ? "time" : item.icon}
								size={24}
								color={isActive ? "#1a1a2e" : "#05071A"}
							/>
							{isActive && <View style={styles.navDot} />}
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: "#05071A",
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 16,
		paddingBottom: 12,
	},
	title: {
		fontSize: 28,
		fontWeight: "800",
		color: "#fafafe",
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 14,
		color: "#b9b9be",
		marginTop: 4,
		fontWeight: "500",
	},
	emptyState: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 30,
		paddingBottom: 100,
	},
	emptyTitle: {
		fontSize: 20,
		fontWeight: "700",
		color: "#f1f1ff",
		marginTop: 14,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#a9abc3",
		textAlign: "center",
		marginTop: 8,
		lineHeight: 22,
	},
	bottomNav: {
		flexDirection: "row",
		justifyContent: "space-around",
		alignItems: "center",
		backgroundColor: "rgba(255,255,255,0.18)",
		paddingVertical: 10,
		paddingHorizontal: 10,
		borderRadius: 36,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.55)",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.14,
		shadowRadius: 18,
		elevation: 18,
		overflow: "hidden",
		position: "absolute",
		bottom: 16,
		left: 16,
		right: 16,
	},
	navItem: {
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
		paddingVertical: 4,
		gap: 4,
	},
	navDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: "#FF4E6A",
		marginTop: 2,
	},
});
