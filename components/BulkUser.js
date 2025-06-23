import { Button, Divider, Input, Select, SelectItem, Spacer, Tab, Tabs } from "@nextui-org/react";
import axios from "axios";
import { CheckCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import XLStoJSON from "./XLStoJSON";

export default function BulkUser() {
  const [users, setUsers] = useState([]);
  const [tempData, setTempData] = useState({});
  const [data, setData] = useState({});
  const [emailStatus, setEmailStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  const [type,setType] = useState(0)

  const types = [
    {
      title:'Manual Creation',
      value:0
    },
    {
      title:'Automatic via File',
      value:1
    }
  ]

  const roles = [
    { title: "Student", value: "user" },
    { title: "Teacher", value: "teacher" },
  ];

  const fields = [
    { label: "City", placeholder: "Enter your City", key: "city", type: "text" },
    { label: "Password", placeholder: "Enter Common Password", key: "password", type: "password" },
    { label: "Role", placeholder: "Select User Role", key: "role", type: "select", items: roles },
  ];

  // Check if email exists in the database
  const checkEmail = async (email) => {
    if (!email) return;

    try {
      const response = await axios.post("/api/cme", { emails:email });
      setEmailStatus(response?.data);
    } catch (error) {
      toast.error("Error checking email");
    }
  };

  const addUser = async () => {
    if (!tempData?.email || !tempData?.full_name) {
      toast.error("Please fill all details.");
      return;
    }

    if (emailStatus[tempData.email]) {
      toast.error("Email already exists.");
      return;
    }

    setUsers((prev) => [...prev, tempData]);
    setTempData({});
  };

  useEffect(()=>{
    if(users?.length > 0){
        checkEmail(users?.map((item)=>item.email));
    }
  },[
    users?.length
  ])

  const deleteUserByIndex = (index) => {
    setUsers((prev) => prev.filter((_, i) => i !== index));
  };


  useEffect(()=>{
    setData({})
    setUsers([])
  },[type])

  const bulkCreateUser = async () => {
    if (!data || users.length === 0) {
      toast.error("Empty Data");
      return;
    }



    const dataUser = {
      userdata: users?.map((i) => ({
        email: i.email.trim(),
        email_confirm: true,
        password: type == 0 ? data.password.trim() : i.password.trim(),
        user_metadata: {
          full_name: i.full_name.trim(),
          city: type == 0 ?  data?.city?.trim() : i?.city.trim(),
          role: type == 0 ?  data?.role?.trim() : i?.role.trim(),
        },
      })),
    }   ;

    setLoading(true);
    try {
      const { data: response } = await axios.post("/api/bulkCreateUser", dataUser);

      if (response.errors && response.errors.length > 0) {
        response.errors.forEach((err) => toast.error(`Failed to create ${err.email}: ${err.error}`));
      }
      if (response.responses && response.responses.length > 0) {
        toast.success("Users created successfully");
        setData({});
        setUsers([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-start justify-start">
      <h2 className="text-2xl font-bold">Create Users</h2>
      <Spacer y={2} />
      <Tabs onSelectionChange={(e)=>{setType(e)}}>
{types && types.map((ty,ind)=>{
  return <Tab value={ty.value} key={ty.value} title={ty?.title}></Tab>
})}
      </Tabs>

      {type == 0 ?<>
      <div className="w-full max-w-[400px]">
        {users && users.map((user, index) => (
          <div
            key={index}
            className="p-2 w-full flex items-center justify-between border border-dashed border-gray-300 rounded-lg mb-2"
          >
            <div className="flex flex-col">
              <span>{user.full_name}</span>
              <span>{user.email}</span>
            </div>
            <Button size="sm" color="danger" onPress={() => deleteUserByIndex(index)}>
              Delete
            </Button>
            {emailStatus[user?.email] == 'exists' ? <X className="text-red-500"></X>:<CheckCircle className="text-green-600"></CheckCircle>}
          </div>
        ))}
      </div>
      <Spacer y={2} />
      <div className="flex items-center gap-2">
        <Input
          placeholder="Enter User Email"
          value={tempData.email || ""}
          onChange={(e) => {
            const email = e.target.value;
            setTempData({ ...tempData, email });
            
          }}
          status={emailStatus[tempData.email] ? "error" : "default"}
        />
        <Input
          placeholder="Enter User Name"
          value={tempData.full_name || ""}
          onChange={(e) => setTempData({ ...tempData, full_name: e.target.value })}
        />
        <Button color="primary" onPress={addUser} disabled={emailStatus[tempData.email]}>
          Add
        </Button>
      </div>
      <Spacer y={2} />
      <h2 className="text-xl font-bold">Common Details for All Users</h2>
      {fields && fields.map((i,d)=>{

return <>
{i.type == "text" ? 
<Input className="mb-2" size="sm" name={i.key} placeholder={i.placeholder} label={i.label} value={(data && data[i?.key])??''} onChange={(e)=>{setData(res=>({...res,[i.key]:e.target.value}))}}></Input>
:''}
{i.type == "select" ? 
<Select className="mb-2" size="sm" placeholder={i.placeholder} label={i.label} value={(data && data[i?.key])??''} onSelectionChange={(e)=>{setData(res=>({...res,[i.key]:e.anchorKey}))}}>

    {i.items && i.items.map((z,v)=>{
        return <SelectItem value={z.value} key={z.value}>{z.title}</SelectItem>
    })}
</Select>
:''}
{i.type == "password" ? 
<Input name={i.key} size="sm" placeholder={i.placeholder} className="mb-2" endContent={<Button size="sm" color="primary" onPress={()=>{setVisible(!visible)}}>
{visible ? 'Hide':'Show'}
</Button>} type={visible ? "text":"password"}  label={i.label} value={(data && data[i?.key])??''} onChange={(e)=>{setData(res=>({...res,[i.key]:e.target.value}))}}></Input>
:''}
</>

})}

</>:''}

{type == 1 ?  <><XLStoJSON onParseComplete={(e)=>{setUsers(e)}}></XLStoJSON>
{users && users.map((user,index)=>{
return <div className="mb-2 w-full bg-white rounded-xl border-1 border-gray-100 shadow-md p-3 flex flex-row items-center justify-between">
  
  <div className="flex-1 flex flex-col items-start justify-center">
  <h2 className="font-semibold text-primary">{user?.full_name}</h2>
  <p className="text-xs text-gray-600">{user?.email}</p>
  </div>
  <p className="flex-1 flex flex-col text-sm items-start justify-center">{user?.city}</p>

  <p className="flex-1 text-sm flex flex-col items-start justify-center">{user?.password}</p>

  <p className="flex-1 text-sm flex flex-col items-start justify-center">{user?.role}</p>
  {emailStatus[user?.email] == 'exists' ? <X className="text-red-500"></X>:<CheckCircle className="text-green-600"></CheckCircle>}

  <Button size="sm" className="ml-8" color="danger" onPress={() => deleteUserByIndex(index)}>
              Delete
            </Button>
</div>
})}
</>
:''}
      <Spacer y={2} />
      <Button
        color="primary"
        onPress={bulkCreateUser}
        isLoading={loading}
      >
        Bulk Add
      </Button>

      <Divider></Divider>
     
    </div>
  );
}
