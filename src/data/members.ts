import { MemberTag } from '@/types/place';

export interface MemberOption {
  id: MemberTag;
  label: string;
  emoji: string;
  description: string;
}

export const memberOptions: MemberOption[] = [
  { id: 'date', label: '데이트', emoji: '💑', description: '부부 / 연인' },
  { id: 'family_infant', label: '가족여행 (영유아)', emoji: '👶', description: '만 0~5세 영유아 동반' },
  { id: 'family_child', label: '가족여행 (어린이)', emoji: '🧒', description: '초등학생 자녀 동반' },
  { id: 'family_senior', label: '가족여행 (고령자)', emoji: '👴', description: '부모님·어르신 동반' },
  { id: 'family_3gen', label: '3대 가족', emoji: '👨‍👩‍👧‍👦', description: '조부모 + 부모 + 아이' },
  { id: 'friends_small', label: '지인 (소규모)', emoji: '👫', description: '2~4명 친구 모임' },
  { id: 'friends_large', label: '지인 (단체)', emoji: '👥', description: '5명 이상 단체' },
  { id: 'solo', label: '혼자 (솔로)', emoji: '🚶', description: '1인 자유 여행' },
  { id: 'pet', label: '반려동물 동반', emoji: '🐾', description: '강아지·고양이 등 반려동물과 함께' },
  { id: 'company', label: '회사 워크샵', emoji: '🏢', description: '팀빌딩·회식 여행' },
];
