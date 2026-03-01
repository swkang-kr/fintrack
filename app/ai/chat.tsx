import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { BannerAdBottom } from '@/components/ads/BannerAd';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useHoldingsWithPnL } from '@/hooks/usePortfolio';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useAiChat, useAiUsage } from '@/hooks/useAiReport';
import { AiChatMessage } from '@/types/report';

const SUGGESTED = [
  '내 포트폴리오 리스크를 알려줘',
  '리밸런싱이 필요한가요?',
  '지금 USD 환전 타이밍인가요?',
  '내 보유 종목 중 주의해야 할 종목은?',
];

function buildHoldingPayload(holdings: ReturnType<typeof useHoldingsWithPnL>['holdings']) {
  return holdings.map((h) => ({
    name: h.name,
    ticker: h.ticker,
    market: h.market,
    quantity: h.quantity,
    avgPrice: h.avg_price,
    currentPrice: h.quote?.price ?? null,
    currency: h.currency,
    pnlPercent: h.quote ? h.pnlPercent : null,
    valueKrw: h.currentValue,
  }));
}

export default function AiChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { holdings, summary, isLoading: holdingsLoading } = useHoldingsWithPnL();
  const { data: rates } = useExchangeRates();
  const { data: usage } = useAiUsage();
  const chatMutation = useAiChat();

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const usdKrw = rates?.rates.USD ?? 1350;
  const remaining = usage ? usage.effectiveLimit - usage.usedToday : null;
  const limitReached = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="AI 투자 챗봇" />
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="AI 챗봇을 사용하려면 로그인해주세요."
          actionLabel="로그인하기"
          onAction={() => router.push('/auth/login')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  if (!holdingsLoading && holdings.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScreenHeader title="AI 투자 챗봇" />
        <EmptyState
          icon="📂"
          title="보유 종목이 없습니다"
          description="포트폴리오에 종목을 추가하면 AI가 맞춤 분석을 제공합니다."
          actionLabel="종목 추가하기"
          onAction={() => router.push('/holdings/add')}
        />
        <BannerAdBottom />
      </SafeAreaView>
    );
  }

  async function handleSend(text?: string) {
    const content = (text ?? inputText).trim();
    if (!content) return;
    if (limitReached) {
      Alert.alert('한도 초과', '오늘 AI 사용 한도를 모두 사용했습니다.');
      return;
    }

    const userMsg: AiChatMessage = { role: 'user', content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');

    chatMutation.mutate(
      {
        messages: nextMessages.slice(-10),
        holdings: buildHoldingPayload(holdings),
        totalValueKrw: summary.totalValue,
        usdKrw,
      },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.message },
          ]);
        },
        onError: (err: unknown) => {
          setMessages((prev) => prev.slice(0, -1));
          Alert.alert('오류', err instanceof Error ? err.message : '응답에 실패했습니다.');
        },
      }
    );
  }

  function renderMessage({ item, index }: { item: AiChatMessage; index: number }) {
    const isUser = item.role === 'user';
    return (
      <View
        key={index}
        style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}
      >
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }

  const isPending = chatMutation.isPending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScreenHeader title="AI 투자 챗봇" />

      {/* Credit Badge */}
      <View style={styles.creditRow}>
        <View style={styles.creditBadge}>
          <Text style={styles.creditText}>
            {remaining !== null ? `오늘 ${remaining}/${usage?.effectiveLimit}회 가능` : '로딩 중...'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.messageListEmpty,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>무엇이든 물어보세요</Text>
              <Text style={styles.emptyChatDesc}>포트폴리오 기반 맞춤 AI 상담을 받아보세요.</Text>
              <View style={styles.suggestedList}>
                {SUGGESTED.map((q) => (
                  <Pressable key={q} style={styles.suggestedChip} onPress={() => handleSend(q)}>
                    <Text style={styles.suggestedText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            isPending ? (
              <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>AI</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <Text style={styles.typingText}>AI 응답 중...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="질문을 입력하세요..."
            placeholderTextColor="#9AA0A6"
            multiline
            maxLength={500}
            editable={!isPending && !limitReached}
            returnKeyType="send"
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || isPending || limitReached) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isPending || limitReached}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <BannerAdBottom />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  flex: { flex: 1 },

  creditRow: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row' },
  creditBadge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  creditText: { fontSize: 12, fontWeight: '600', color: '#1A73E8' },

  messageList: { padding: 16, gap: 12 },
  messageListEmpty: { flex: 1, justifyContent: 'center' },

  emptyChat: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyChatTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  emptyChatDesc: { fontSize: 13, color: '#5F6368', textAlign: 'center' },
  suggestedList: { gap: 8, width: '100%', marginTop: 8 },
  suggestedChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E8EAED',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  suggestedText: { fontSize: 13, color: '#1A73E8', fontWeight: '500' },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubbleRowAssistant: { justifyContent: 'flex-start' },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#1A73E8',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#1A1A1A' },
  typingText: { fontSize: 14, color: '#9AA0A6', fontStyle: 'italic' },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  sendBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C5CACE' },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
