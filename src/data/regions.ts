export interface RegionGroup {
  label: string;
  regions: Region[];
}

export interface Region {
  id: string;
  label: string;
  description?: string;
  lat: number;
  lng: number;
}

export const regionGroups: RegionGroup[] = [
  {
    label: '서울',
    regions: [
      { id: 'seoul-central', label: '서울 도심권', description: '종로·중구·용산', lat: 37.5704, lng: 126.9831 },
      { id: 'seoul-northeast', label: '서울 동북권', description: '성동·광진·동대문·성북·강북·도봉·노원', lat: 37.6063, lng: 127.0926 },
      { id: 'seoul-northwest', label: '서울 서북권', description: '은평·서대문·마포', lat: 37.5791, lng: 126.9368 },
      { id: 'seoul-southwest', label: '서울 서남권', description: '양천·강서·구로·금천·영등포·동작·관악', lat: 37.5196, lng: 126.8795 },
      { id: 'seoul-southeast', label: '서울 동남권', description: '서초·강남·송파·강동', lat: 37.5004, lng: 127.0622 },
    ],
  },
  {
    label: '경기',
    regions: [
      { id: 'gyeonggi-north', label: '경기 북부', description: '파주·가평·포천·양주·의정부', lat: 37.8248, lng: 127.0454 },
      { id: 'gyeonggi-south', label: '경기 남부', description: '수원·용인·화성·안양·성남', lat: 37.2636, lng: 127.0286 },
    ],
  },
  {
    label: '인천 / 충청 / 대전',
    regions: [
      { id: 'incheon', label: '인천', lat: 37.4563, lng: 126.7052 },
      { id: 'daejeon', label: '대전·세종', lat: 36.3504, lng: 127.3845 },
      { id: 'chungbuk', label: '충북', lat: 36.6358, lng: 127.4913 },
      { id: 'chungnam', label: '충남', lat: 36.6588, lng: 126.6728 },
    ],
  },
  {
    label: '강원',
    regions: [
      { id: 'gangwon', label: '강원', lat: 37.8228, lng: 128.1555 },
    ],
  },
  {
    label: '전라 / 광주',
    regions: [
      { id: 'jeonbuk', label: '전북', lat: 35.7175, lng: 127.1530 },
      { id: 'jeonnam', label: '전남', lat: 34.8161, lng: 126.4629 },
      { id: 'gwangju', label: '광주', lat: 35.1595, lng: 126.8526 },
    ],
  },
  {
    label: '경상 / 대구 / 부산 / 울산',
    regions: [
      { id: 'gyeongbuk', label: '경북', lat: 36.4919, lng: 128.8889 },
      { id: 'daegu', label: '대구', lat: 35.8714, lng: 128.6014 },
      { id: 'gyeongnam', label: '경남', lat: 35.4606, lng: 128.2132 },
      { id: 'busan', label: '부산', lat: 35.1796, lng: 129.0756 },
      { id: 'ulsan', label: '울산', lat: 35.5384, lng: 129.3114 },
    ],
  },
  {
    label: '제주',
    regions: [
      { id: 'jeju-city', label: '제주시', lat: 33.4996, lng: 126.5312 },
      { id: 'jeju-seogwipo', label: '서귀포', lat: 33.2541, lng: 126.5600 },
    ],
  },
];

export const allRegions = regionGroups.flatMap((g) => g.regions);

export function getRegionById(id: string) {
  return allRegions.find((r) => r.id === id);
}
