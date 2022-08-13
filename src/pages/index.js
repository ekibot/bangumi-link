import { Input, Card } from 'antd';
import { useNavigate } from 'react-router-dom';

function Page() {
  const navigate = useNavigate()
  return (
    <>
      <Card title="Bangumi 条目链接">
        <Input.Search
          placeholder="输入bgm条目链接"
          enterButton="GO!"
          size="large"
          onSearch={(url) => {
            url = url.split('/')
            const subject_id = url[url.length - 1]
            navigate(`subject/${subject_id}`);
          }}
        />
      </Card>
      <Card title="用户收藏关系检索">
        <Input.Search
          placeholder="输入bgm用户id"
          enterButton="GO!"
          size="large"
          onSearch={(v) => navigate(`user/${v}`)}
        />
      </Card>
    </>
  );
}

export default Page;