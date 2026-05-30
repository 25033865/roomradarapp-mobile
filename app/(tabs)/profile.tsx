import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { updateProfile } from "firebase/auth";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Image,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useAuth } from "../../authprovider";

const AVATAR_URL =
	"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80";
const APP_BACKGROUND = "#05071A";
const PRIMARY_TEXT = "#FAFAFE";
const SECONDARY_TEXT = "#B9B9BE";
const MUTED_TEXT = "#A9ABC3";
const EDIT_GREEN = "#15936D";

type ProfileItem = {
	label: string;
	icon: keyof typeof Ionicons.glyphMap;
};

const PROFILE_ITEMS: ProfileItem[] = [
	{ label: "Manage Profile", icon: "person-circle-outline" },
	{ label: "Password & Security", icon: "lock-closed-outline" },
	{ label: "Notifications", icon: "notifications-outline" },
	{ label: "Language", icon: "language-outline" },
	{ label: "About Us", icon: "information-circle-outline" },
	{ label: "Theme", icon: "color-palette-outline" },
	{ label: "Appointments", icon: "calendar-outline" },
	{ label: "Help Center", icon: "help-circle-outline" },
	{ label: "Contact Us", icon: "call-outline" },
];

export default function ProfileScreen() {
	const router = useRouter();
	const params = useLocalSearchParams<{ mode?: string }>();
	const { user } = useAuth();
	const [draftName, setDraftName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const isEditing = params.mode === "edit";

	const displayName = useMemo(() => {
		const profileName = user?.displayName?.trim();
		if (profileName) {
			return profileName;
		}

		const emailName = user?.email?.split("@")[0]?.trim();
		return emailName || "Guest";
	}, [user?.displayName, user?.email]);

	const email = user?.email?.trim() || "guest@roomradar.app";
	const avatarUri = user?.photoURL || AVATAR_URL;

	useEffect(() => {
		if (isEditing) {
			setDraftName(displayName === "Guest" ? "" : displayName);
		}
	}, [displayName, isEditing]);

	const handleEditProfilePress = useCallback(() => {
		router.push("/profile?mode=edit");
	}, [router]);

	const handleCloseEdit = useCallback(() => {
		router.replace("/profile");
	}, [router]);

	const handleSaveProfile = useCallback(async () => {
		const nextName = draftName.trim();

		if (!nextName) {
			Alert.alert("Missing name", "Please enter your name.");
			return;
		}

		if (!user) {
			Alert.alert("Not signed in", "Please sign in again to edit your profile.");
			return;
		}

		setIsSaving(true);

		try {
			await updateProfile(user, { displayName: nextName });
			handleCloseEdit();
		} catch {
			Alert.alert("Update failed", "We could not update your profile. Please try again.");
		} finally {
			setIsSaving(false);
		}
	}, [draftName, handleCloseEdit, user]);

	const handleBottomNavPress = useCallback((key: string) => {
		if (key === "home") {
			router.replace("/userhome");
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
	}, [router]);

	if (isEditing) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />

				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : undefined}
					style={styles.editFlex}
				>
					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={styles.editContent}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.editHeader}>
							<TouchableOpacity
								style={styles.backButton}
								onPress={handleCloseEdit}
								activeOpacity={0.75}
							>
								<Ionicons name="chevron-back" size={22} color={PRIMARY_TEXT} />
							</TouchableOpacity>
							<Text style={styles.editTitle}>Edit profile</Text>
							<View style={styles.headerSpacer} />
						</View>

						<View style={styles.editAvatarWrap}>
							<Image source={{ uri: avatarUri }} style={styles.editAvatar} />
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.inputLabel}>Full name</Text>
							<TextInput
								style={styles.input}
								value={draftName}
								onChangeText={setDraftName}
								placeholder="Enter your name"
								placeholderTextColor="#6F7488"
								autoCapitalize="words"
							/>
						</View>

						<View style={styles.formGroup}>
							<Text style={styles.inputLabel}>Email address</Text>
							<TextInput
								style={[styles.input, styles.inputDisabled]}
								value={email}
								editable={false}
								placeholderTextColor="#6F7488"
							/>
						</View>

						<TouchableOpacity
							style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
							onPress={handleSaveProfile}
							disabled={isSaving}
							activeOpacity={0.8}
						>
							<Text style={styles.saveButtonText}>
								{isSaving ? "Saving..." : "Save changes"}
							</Text>
							{isSaving ? (
								<ActivityIndicator size="small" color="#05140F" />
							) : null}
						</TouchableOpacity>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />

			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.content}
			>
				<Text style={styles.title}>Profile</Text>

				<View style={styles.profileCard}>
					<Image source={{ uri: avatarUri }} style={styles.avatar} />
					<Text style={styles.name} numberOfLines={1}>
						{displayName}
					</Text>
					<Text style={styles.email} numberOfLines={1}>
						{email}
					</Text>
					<TouchableOpacity
						style={styles.editButton}
						onPress={handleEditProfilePress}
						activeOpacity={0.75}
					>
						<Text style={styles.editButtonText}>Edit profile</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.menu}>
					{PROFILE_ITEMS.map((item) => (
						<TouchableOpacity
							key={item.label}
							style={styles.menuItem}
							activeOpacity={0.65}
						>
							<View style={styles.menuLeft}>
								<Ionicons name={item.icon} size={20} color={SECONDARY_TEXT} />
								<Text style={styles.menuText}>{item.label}</Text>
							</View>
							<Ionicons name="chevron-forward" size={16} color={SECONDARY_TEXT} />
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>

			<View style={styles.bottomNav}>
				<BlurView
					intensity={70}
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
					const isActive = item.key === "profile";
					return (
						<TouchableOpacity
							key={item.key}
							style={styles.navItem}
							onPress={() => handleBottomNavPress(item.key)}
							activeOpacity={0.7}
						>
							<Ionicons
								name={isActive ? "person" : item.icon}
								size={24}
								color={isActive ? "#1a1a2e" : APP_BACKGROUND}
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
		backgroundColor: APP_BACKGROUND,
	},
	editFlex: {
		flex: 1,
	},
	editContent: {
		paddingHorizontal: 22,
		paddingTop: 14,
		paddingBottom: 36,
	},
	editHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 28,
	},
	backButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 21,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	editTitle: {
		fontSize: 18,
		fontWeight: "800",
		color: PRIMARY_TEXT,
	},
	headerSpacer: {
		width: 42,
		height: 42,
	},
	editAvatarWrap: {
		alignItems: "center",
		marginBottom: 30,
	},
	editAvatar: {
		width: 96,
		height: 96,
		borderRadius: 48,
		backgroundColor: "#1B2138",
	},
	formGroup: {
		marginBottom: 18,
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: "700",
		color: SECONDARY_TEXT,
		marginBottom: 8,
	},
	input: {
		minHeight: 54,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
		backgroundColor: "#101427",
		paddingHorizontal: 15,
		fontSize: 15,
		fontWeight: "600",
		color: PRIMARY_TEXT,
	},
	inputDisabled: {
		color: MUTED_TEXT,
		opacity: 0.82,
	},
	saveButton: {
		minHeight: 54,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		borderRadius: 18,
		backgroundColor: EDIT_GREEN,
		marginTop: 12,
	},
	saveButtonDisabled: {
		opacity: 0.72,
	},
	saveButtonText: {
		fontSize: 15,
		fontWeight: "800",
		color: "#05140F",
	},
	content: {
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 112,
	},
	title: {
		alignSelf: "center",
		fontSize: 17,
		fontWeight: "800",
		color: PRIMARY_TEXT,
		marginBottom: 30,
	},
	profileCard: {
		alignItems: "center",
		paddingHorizontal: 20,
		paddingTop: 2,
		paddingBottom: 30,
		marginBottom: 2,
	},
	avatar: {
		width: 78,
		height: 78,
		borderRadius: 39,
		backgroundColor: "#1B2138",
		marginBottom: 10,
	},
	name: {
		maxWidth: "90%",
		fontSize: 23,
		fontWeight: "800",
		color: PRIMARY_TEXT,
		textAlign: "center",
		marginBottom: 2,
	},
	email: {
		maxWidth: "90%",
		fontSize: 14,
		fontWeight: "500",
		color: MUTED_TEXT,
		textAlign: "center",
		marginBottom: 18,
	},
	editButton: {
		minWidth: 132,
		minHeight: 40,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 22,
		borderWidth: 1.5,
		borderColor: EDIT_GREEN,
		paddingHorizontal: 22,
	},
	editButtonText: {
		fontSize: 14,
		fontWeight: "800",
		color: EDIT_GREEN,
	},
	menu: {
		gap: 2,
	},
	menuItem: {
		minHeight: 52,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
	},
	menuLeft: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		minWidth: 0,
	},
	menuText: {
		flex: 1,
		fontSize: 14,
		fontWeight: "600",
		color: PRIMARY_TEXT,
		marginLeft: 13,
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
