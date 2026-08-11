import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../authprovider";

const DESCRIPTION_LIMIT = 400;
const APP_BACKGROUND = "#05071A";
const PANEL = "#101427";
const PANEL_ALT = "#0B1022";
const PRIMARY_TEXT = "#FAFAFE";
const SECONDARY_TEXT = "#B9B9BE";
const MUTED_TEXT = "#8F95AA";
const BORDER = "rgba(255,255,255,0.10)";
const ACCENT = "#EAF2FF";

const DEPARTMENTS = [
	"Customer Support",
	"Bookings",
	"Payments",
	"Technical Support",
	"Safety",
	"Other",
];

type ProfileExtras = {
	phoneNumber?: string;
};

export default function ContactUsScreen() {
	const router = useRouter();
	const { user } = useAuth();
	const insets = useSafeAreaInsets();
	const { height } = useWindowDimensions();
	const [subject, setSubject] = useState("");
	const [department, setDepartment] = useState("");
	const [description, setDescription] = useState("");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [mobileNumber, setMobileNumber] = useState("");
	const [isDepartmentPickerOpen, setIsDepartmentPickerOpen] = useState(false);

	const profileName = useMemo(() => {
		const displayName = user?.displayName?.trim();
		if (displayName) {
			return displayName;
		}

		const emailName = user?.email?.split("@")[0]?.trim();
		return emailName || "";
	}, [user?.displayName, user?.email]);

	const profileEmail = user?.email?.trim() || "";
	const profileStorageKey = useMemo(
		() => `profile-extras:${user?.uid || profileEmail || "guest@roomradar.app"}`,
		[profileEmail, user?.uid]
	);

	const canSend =
		subject.trim().length > 0 &&
		department.length > 0 &&
		description.trim().length > 0 &&
		name.trim().length > 0 &&
		email.trim().length > 0 &&
		mobileNumber.trim().length > 0;
	const bottomInset = Math.max(insets.bottom, 12);
	const scrollBottomPadding = bottomInset + 42;
	const sheetBottomPadding = bottomInset + 22;
	const departmentSheetMaxHeight = height * 0.72;

	useEffect(() => {
		setName(profileName);
		setEmail(profileEmail);
	}, [profileEmail, profileName]);

	useEffect(() => {
		let isMounted = true;

		const loadProfileExtras = async () => {
			const savedProfile = await AsyncStorage.getItem(profileStorageKey);

			if (!isMounted || !savedProfile) {
				return;
			}

			try {
				const parsedProfile = JSON.parse(savedProfile) as ProfileExtras;
				setMobileNumber(parsedProfile.phoneNumber || "");
			} catch {
				setMobileNumber("");
			}
		};

		void loadProfileExtras();

		return () => {
			isMounted = false;
		};
	}, [profileStorageKey]);

	const handleDescriptionChange = useCallback((value: string) => {
		setDescription(value.slice(0, DESCRIPTION_LIMIT));
	}, []);

	const handleSend = useCallback(() => {
		if (!canSend) {
			Alert.alert("Missing information", "Please complete all fields before sending.");
			return;
		}

		Alert.alert(
			"Message sent",
			"We received your request and will get back to you within 24 hours."
		);
		setSubject("");
		setDepartment("");
		setDescription("");
	}, [canSend]);

	const handleBack = useCallback(() => {
		if (router.canGoBack()) {
			router.back();
			return;
		}

		router.replace("/profile");
	}, [router]);

	return (
		<SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
			<StatusBar barStyle="light-content" backgroundColor={APP_BACKGROUND} />
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : undefined}
				style={styles.flex}
			>
				<ScrollView
					contentContainerStyle={[
						styles.content,
						{ paddingBottom: scrollBottomPadding },
					]}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					scrollIndicatorInsets={{ bottom: scrollBottomPadding }}
				>
					<View style={styles.header}>
						<TouchableOpacity
							style={styles.iconButton}
							onPress={handleBack}
							activeOpacity={0.72}
							accessibilityRole="button"
							accessibilityLabel="Go back"
						>
							<Ionicons name="chevron-back" size={22} color={PRIMARY_TEXT} />
						</TouchableOpacity>

						<View style={styles.headerText}>
							<Text style={styles.title}>Contact Us</Text>
							
							<Text style={styles.introText}>
							{"Complete the form below and we'll get back within 24 hours"}
						</Text>
						</View>

						<View style={styles.headerSpacer} />
					</View>

					<View style={styles.fieldGroup}>
						<Text style={styles.label}>{"What's on your mind?"}</Text>
						<TextInput
							style={styles.input}
							value={subject}
							onChangeText={setSubject}
							placeholder="Your Subject Here"
							placeholderTextColor={SECONDARY_TEXT}
							returnKeyType="next"
						/>
					</View>

					<View style={styles.fieldGroup}>
						<Text style={styles.label}>Select a Department</Text>
						<TouchableOpacity
							style={styles.select}
							onPress={() => setIsDepartmentPickerOpen(true)}
							activeOpacity={0.72}
							accessibilityRole="button"
							accessibilityLabel="Select a department"
						>
							<Text
								style={[
									styles.selectText,
									!department && styles.placeholderText,
								]}
								numberOfLines={1}
							>
								{department || "Please Select"}
							</Text>
							<Ionicons name="chevron-down" size={18} color={MUTED_TEXT} />
						</TouchableOpacity>
					</View>

					<View style={styles.fieldGroup}>
						<Text style={styles.label}>Description</Text>
						<TextInput
							style={[styles.input, styles.descriptionInput]}
							value={description}
							onChangeText={handleDescriptionChange}
							placeholder="Please supply specific details here"
							placeholderTextColor={SECONDARY_TEXT}
							multiline
							textAlignVertical="top"
							maxLength={DESCRIPTION_LIMIT}
						/>
						<Text style={styles.counter}>
							{description.length} / {DESCRIPTION_LIMIT}
						</Text>
					</View>

					<ContactField
						label="Name and Surname"
						value={name}
						onChangeText={setName}
						placeholder="Enter your name"
						autoCapitalize="words"
					/>

					<ContactField
						label="Email"
						value={email}
						onChangeText={setEmail}
						placeholder="Enter your email"
						autoCapitalize="none"
						keyboardType="email-address"
					/>

					<ContactField
						label="Mobile Number"
						value={mobileNumber}
						onChangeText={setMobileNumber}
						placeholder="Enter your mobile number"
						keyboardType="phone-pad"
					/>

					<TouchableOpacity
						style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
						onPress={handleSend}
						disabled={!canSend}
						activeOpacity={0.78}
						accessibilityRole="button"
					>
						<Text style={styles.sendButtonText}>SEND</Text>
					</TouchableOpacity>

					<View style={styles.hoursBox}>
						<Text style={styles.hoursTitle}>Call Centre Hours</Text>
						<Text style={styles.hoursHeading}>Monday - Friday</Text>
						<Text style={styles.hoursText}>8am - 5pm</Text>

						<Text style={styles.hoursHeading}>Public Holidays</Text>
						<Text style={styles.hoursText}>10am - 1pm</Text>
						<Text style={styles.hoursNote}>
							{"We're open on public holidays, with the exception of Christmas Day and New Year's Day."}
						</Text>

						<View style={styles.phoneRow}>
							<Ionicons name="call-outline" size={22} color={ACCENT} />
							<Text style={styles.phoneText}>+27 64 624 3837</Text>
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>

			<Modal
				visible={isDepartmentPickerOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsDepartmentPickerOpen(false)}
			>
				<Pressable
					style={styles.modalBackdrop}
					onPress={() => setIsDepartmentPickerOpen(false)}
				>
					<Pressable
						style={[
							styles.departmentSheet,
							{
								maxHeight: departmentSheetMaxHeight,
								paddingBottom: sheetBottomPadding,
							},
						]}
					>
						<Text style={styles.departmentTitle}>Select a Department</Text>
						<ScrollView
							style={styles.departmentOptions}
							showsVerticalScrollIndicator={false}
						>
							{DEPARTMENTS.map((item) => (
								<TouchableOpacity
									key={item}
									style={styles.departmentOption}
									onPress={() => {
										setDepartment(item);
										setIsDepartmentPickerOpen(false);
									}}
									activeOpacity={0.72}
								>
									<Text style={styles.departmentOptionText}>{item}</Text>
									{department === item ? (
										<Ionicons name="checkmark" size={20} color={ACCENT} />
									) : null}
								</TouchableOpacity>
							))}
						</ScrollView>
					</Pressable>
				</Pressable>
			</Modal>
		</SafeAreaView>
	);
}

type ContactFieldProps = {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	placeholder: string;
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	keyboardType?: "default" | "email-address" | "phone-pad";
};

function ContactField({
	label,
	value,
	onChangeText,
	placeholder,
	autoCapitalize = "sentences",
	keyboardType = "default",
}: ContactFieldProps) {
	return (
		<View style={styles.fieldGroup}>
			<Text style={styles.label}>{label}</Text>
			<TextInput
				style={styles.input}
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={SECONDARY_TEXT}
				autoCapitalize={autoCapitalize}
				keyboardType={keyboardType}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: APP_BACKGROUND,
	},
	flex: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 18,
		paddingTop: 14,
		paddingBottom: 36,
	},
	header: {
		flexDirection: "row",
		gap: 12,
		marginTop: 16,
		marginBottom: 22,
	},
	iconButton: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 21,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: "rgba(255,255,255,0.08)",
	},
	headerText: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		color: PRIMARY_TEXT,
		fontSize: 22,
		fontWeight: "800",
	},
	subtitle: {
		color: MUTED_TEXT,
		fontSize: 13,
		fontWeight: "600",
		marginTop: 2,
	},
	headerSpacer: {
		width: 42,
		height: 42,
	},
	intro: {
		alignItems: "center",
		paddingHorizontal: 4,
		marginBottom: 24,
	},
	introTitle: {
		color: PRIMARY_TEXT,
		fontSize: 20,
		fontWeight: "800",
		textAlign: "center",
		marginBottom: 8,
	},
	introText: {
		color: SECONDARY_TEXT,
		fontSize: 13,
		fontWeight: "500",
		lineHeight: 19,
		marginTop: 8,
		textAlign: "center",
	},
	fieldGroup: {
		gap: 7,
		marginBottom: 14,
	},
	label: {
		color: SECONDARY_TEXT,
		fontSize: 13,
		fontWeight: "700",
	},
	input: {
		minHeight: 54,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: PANEL_ALT,
		color: PRIMARY_TEXT,
		fontSize: 15,
		fontWeight: "600",
		paddingHorizontal: 15,
		paddingVertical: 12,
	},
	descriptionInput: {
		minHeight: 118,
	},
	select: {
		minHeight: 54,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderRadius: 16,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: PANEL_ALT,
		paddingHorizontal: 15,
	},
	selectText: {
		flex: 1,
		color: PRIMARY_TEXT,
		fontSize: 15,
		fontWeight: "600",
		marginRight: 14,
	},
	placeholderText: {
		color: MUTED_TEXT,
	},
	counter: {
		alignSelf: "flex-end",
		color: MUTED_TEXT,
		fontSize: 12,
		fontWeight: "700",
		marginTop: 1,
	},
	sendButton: {
		minHeight: 54,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 18,
		backgroundColor: ACCENT,
		marginTop: 8,
		marginBottom: 20,
	},
	sendButtonDisabled: {
		opacity: 0.48,
	},
	sendButtonText: {
		color: "#0B1220",
		fontSize: 15,
		fontWeight: "900",
	},
	hoursBox: {
		borderRadius: 22,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: PANEL,
		paddingHorizontal: 18,
		paddingVertical: 20,
	},
	hoursTitle: {
		color: PRIMARY_TEXT,
		fontSize: 18,
		fontWeight: "900",
		marginBottom: 20,
	},
	hoursHeading: {
		color: PRIMARY_TEXT,
		fontSize: 15,
		fontWeight: "900",
		marginBottom: 6,
	},
	hoursText: {
		color: SECONDARY_TEXT,
		fontSize: 14,
		fontWeight: "700",
		marginBottom: 20,
	},
	hoursNote: {
		color: SECONDARY_TEXT,
		fontSize: 14,
		fontWeight: "600",
		lineHeight: 22,
		marginBottom: 20,
	},
	phoneRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	phoneText: {
		color: PRIMARY_TEXT,
		fontSize: 18,
		fontWeight: "900",
	},
	modalBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.58)",
	},
	departmentSheet: {
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		borderWidth: 1,
		borderColor: BORDER,
		backgroundColor: PANEL,
		paddingHorizontal: 22,
		paddingTop: 22,
		paddingBottom: 34,
	},
	departmentTitle: {
		color: PRIMARY_TEXT,
		fontSize: 18,
		fontWeight: "900",
		marginBottom: 12,
	},
	departmentOptions: {
		flexShrink: 1,
	},
	departmentOption: {
		minHeight: 50,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
	},
	departmentOptionText: {
		color: PRIMARY_TEXT,
		fontSize: 15,
		fontWeight: "700",
	},
});
